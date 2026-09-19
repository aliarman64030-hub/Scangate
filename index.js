const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
admin.initializeApp();
const db = admin.firestore();
const bucket = admin.storage().bucket();

// Helper: Get PayPal Access Token with strict error checking
async function getPayPalAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch(`${process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'}/v1/oauth2/token`, {
    method: 'POST',
    body: 'grant_type=client_credentials',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`PayPal OAuth failed: ${response.status} ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Helper: Fetch Authoritative Subscription Details directly from PayPal API
async function fetchPayPalSubscriptionDetails(subscriptionId, accessToken) {
  try {
    const response = await fetch(`${process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Failed to fetch PayPal subscription details: ${response.status} ${errorBody}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Network error fetching PayPal subscription details:", error);
    return null;
  }
}

// Helper: Verify PayPal Signature via Official API with strict status checks
async function verifyPayPalSignatureApi(req, rawBodyString) {
  try {
    const accessToken = await getPayPalAccessToken();
    const verificationBody = {
      auth_algo: req.headers['paypal-auth-algo'],
      cert_url: req.headers['paypal-cert-url'],
      transmission_id: req.headers['paypal-transmission-id'],
      transmission_sig: req.headers['paypal-transmission-sig'],
      transmission_time: req.headers['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBodyString)
    };

    const response = await fetch(`${process.env.PAYPAL_API_BASE || 'https://api-m.sandbox.paypal.com'}/v1/notifications/verify-webhook-signature`, {
      method: 'POST',
      body: JSON.stringify(verificationBody),
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`PayPal signature verification HTTP error: ${response.status} ${errorBody}`);
      return false;
    }

    const result = await response.json();
    return result.verification_status === "SUCCESS";
  } catch (error) {
    console.error("PayPal Signature Verification Exception:", error);
    return false;
  }
}

// Production Webhook Handler with Method Guard, Payload Validation & Fail-Closed API Sync
exports.paypalWebhook = onRequest(async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    if (!req.rawBody) {
      console.error("Security Alert: Missing raw webhook body.");
      return res.status(400).send("Invalid webhook body.");
    }
    const rawBodyString = req.rawBody.toString("utf8");

    const isVerified = await verifyPayPalSignatureApi(req, rawBodyString);
    if (!isVerified) {
      console.warn("Security Alert: Invalid PayPal signature.");
      return res.status(400).send("Verification failed.");
    }

    const event = req.body;
    const eventId = event?.id;
    const eventType = event?.event_type;
    const resource = event?.resource;

    if (!eventId || !eventType || !resource) {
      console.error("Malformed webhook event payload received.");
      return res.status(400).send("Invalid webhook event payload.");
    }

    const supportedEvents = [
      "BILLING.SUBSCRIPTION.ACTIVATED",
      "PAYMENT.SALE.COMPLETED",
      "BILLING.SUBSCRIPTION.CANCELLED",
      "BILLING.SUBSCRIPTION.SUSPENDED",
      "BILLING.SUBSCRIPTION.EXPIRED",
      "BILLING.SUBSCRIPTION.PAYMENT.FAILED",
      "PAYMENT.SALE.REFUNDED",
      "PAYMENT.SALE.REVERSED"
    ];

    if (!supportedEvents.includes(eventType)) {
      await db.collection("processedWebhooks").doc(eventId).set({
        processedAt: admin.firestore.FieldValue.serverTimestamp(),
        eventType,
        ignored: true
      });
      return res.status(200).json({ received: true, note: "Unsupported event ignored safely" });
    }

    let subscriptionId = null;
    if (eventType.startsWith("BILLING.SUBSCRIPTION.")) {
      subscriptionId = resource.id;
    } else if (eventType.startsWith("PAYMENT.SALE.")) {
      subscriptionId = resource.billing_agreement_id;
    }

    if (!subscriptionId) {
      console.warn(`Webhook event ${eventType} missing valid subscription identifier mapping context.`);
      return res.status(200).json({ received: true, note: "Non-subscription sale event ignored safely" });
    }

    const mappingDoc = await db.collection("paymentMappings").doc(subscriptionId).get();
    if (!mappingDoc.exists || !mappingDoc.data().uid) {
      console.warn("Unmapped or untrusted PayPal subscription ID ignored:", subscriptionId);
      return res.status(200).json({ received: true, note: "Unmapped subscription ignored safely" });
    }
    const firebaseUid = mappingDoc.data().uid;

    const accessToken = await getPayPalAccessToken();
    const paypalDetails = await fetchPayPalSubscriptionDetails(subscriptionId, accessToken);

    await db.runTransaction(async (transaction) => {
      const eventRef = db.collection("processedWebhooks").doc(eventId);
      const eventSnap = await transaction.get(eventRef);
      if (eventSnap.exists) return;

      const subRef = db.collection("subscriptions").doc(firebaseUid);
      const existingSubSnap = await transaction.get(subRef);
      const existingSub = existingSubSnap.exists ? existingSubSnap.data() : null;

      let subStatus = existingSub?.status || "inactive";
      let expiryDate = existingSub?.expiryDate?.toDate?.() || new Date();
      if (expiryDate < new Date()) expiryDate = new Date();

      const apiNextBillingTime = paypalDetails?.billing_info?.next_billing_time
        ? new Date(paypalDetails.billing_info.next_billing_time)
        : null;

      if (eventType === "BILLING.SUBSCRIPTION.ACTIVATED" || eventType === "PAYMENT.SALE.COMPLETED") {
        if (!paypalDetails) {
          throw new Error("Critical: Unable to verify authoritative PayPal subscription state. Forcing retry.");
        }

        subStatus = "active";
        if (apiNextBillingTime) {
          expiryDate = apiNextBillingTime;
        } else if (resource.billing_info?.next_billing_time) {
          expiryDate = new Date(resource.billing_info.next_billing_time);
        } else {
          expiryDate = new Date();
          expiryDate.setMonth(expiryDate.getMonth() + 1);
        }
      } else if (eventType === "BILLING.SUBSCRIPTION.CANCELLED" || eventType === "BILLING.SUBSCRIPTION.SUSPENDED") {
        subStatus = "cancelled_pending_expiry";
        if (apiNextBillingTime) {
          expiryDate = apiNextBillingTime;
        } else if (resource.billing_info?.next_billing_time) {
          expiryDate = new Date(resource.billing_info.next_billing_time);
        }
      } else if (eventType === "BILLING.SUBSCRIPTION.EXPIRED" || eventType === "BILLING.SUBSCRIPTION.PAYMENT.FAILED") {
        subStatus = eventType === "BILLING.SUBSCRIPTION.EXPIRED" ? "expired" : "payment_failed";
        if (eventType === "BILLING.SUBSCRIPTION.EXPIRED") {
          expiryDate = new Date();
        }
      } else if (eventType === "PAYMENT.SALE.REFUNDED" || eventType === "PAYMENT.SALE.REVERSED") {
        if (resource.status === "PARTIALLY_REFUNDED") {
          subStatus = "active_partially_refunded";
        } else {
          subStatus = "refunded_revoked";
          expiryDate = new Date();
        }
      }

      transaction.set(subRef, {
        status: subStatus,
        plan: "pro_monthly",
        provider: "paypal",
        lastEventId: eventId,
        eventType: eventType,
        expiryDate: admin.firestore.Timestamp.fromDate(expiryDate),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      transaction.set(eventRef, { processedAt: admin.firestore.FieldValue.serverTimestamp() });
    });

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook Execution Error:", error);
    res.status(500).send("Webhook processing failed.");
  }
});

async function deleteQueryBatch(db, query) {
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}

async function updateQueryBatch(db, query, updateData) {
  while (true) {
    const snapshot = await query.limit(400).get();
    if (snapshot.empty) break;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.update(doc.ref, updateData));
    await batch.commit();
  }
}

exports.deleteUserAccountSecure = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication required.');
  }

  const authTime = request.auth.token.auth_time;
  const currentTime = Math.floor(Date.now() / 1000);
  if (!authTime || (currentTime - authTime) > 600) {
    throw new HttpsError('unauthenticated', 'Recent re-authentication required to delete account. Please login again.');
  }

  const userId = request.auth.uid;

  try {
    await deleteQueryBatch(db, db.collection("watchlist").where("uid", "==", userId));
    await deleteQueryBatch(db, db.collection("notifications").where("uid", "==", userId));
    await deleteQueryBatch(db, db.collection("usage").where("uid", "==", userId));
    await deleteQueryBatch(db, db.collection("paymentMappings").where("uid", "==", userId));
    await deleteQueryBatch(db, db.collection("disputes").where("claimantUid", "==", userId));

    await updateQueryBatch(db, db.collection("reports").where("reporterUid", "==", userId), {
      reporterUid: "DELETED_USER_ANONYMIZED",
      reporterName: "Redacted User",
      reporterEmail: "redacted@scangate.internal",
      reporterPhone: "REDACTED",
      address: "REDACTED"
    });

    await bucket.deleteFiles({ prefix: `evidence/${userId}/` });
    await bucket.deleteFiles({ prefix: `disputes/${userId}/` });

    await db.collection("users").doc(userId).delete();
    await db.collection("subscriptions").doc(userId).delete();
    await admin.auth().deleteUser(userId);

    return { success: true, message: "Account, chunked records, files, and PII completely scrubbed." };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});
