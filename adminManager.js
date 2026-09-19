// adminManager.js (Run this via Node.js backend environment securely)
const admin = require("firebase-admin");
admin.initializeApp();

// Grant Admin Custom Claim
async function grantAdminRole(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true });
    // Keep Firestore user record synced
    await admin.firestore().collection("users").doc(uid).set({ role: "admin" }, { merge: true });
    console.log(`Successfully granted admin privileges to user: ${uid}`);
  } catch (error) {
    console.error("Error granting admin role:", error);
  }
}

// Revoke Admin Custom Claim
async function revokeAdminRole(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, { admin: false });
    await admin.firestore().collection("users").doc(uid).set({ role: "user" }, { merge: true });
    console.log(`Successfully revoked admin privileges from user: ${uid}`);
  } catch (error) {
    console.error("Error revoking admin role:", error);
  }
}

// Example execution:
// grantAdminRole("TARGET_USER_UID_HERE");
