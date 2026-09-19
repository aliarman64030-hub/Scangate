// ==========================================
// SCANGATE REAL-TIME ALERT & WEBHOOK ENGINE
// ==========================================

import { db } from './firebase-config.js';
import { collection, query, orderBy, limit, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Initializes a real-time listener on the Firestore 'reports' collection.
 * Whenever a new scam report is filed, it triggers an instant UI toast/banner alert.
 */
export function initializeRealtimeAlerts(onNewAlertCallback) {
    try {
        const reportsRef = collection(db, "reports");
        // Query the latest reports ordered by creation time
        const q = query(reportsRef, orderBy("createdAt", "desc"), limit(1));

        // onSnapshot provides real-time updates from Firestore
        onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const reportData = change.doc.data();
                    console.log("🚨 Real-Time Threat Alert Triggered:", reportData);

                    // Trigger custom callback if provided (e.g. to display UI popup)
                    if (typeof onNewAlertCallback === 'function') {
                        onNewAlertCallback(reportData);
                    }
                }
            });
        }, (error) => {
            console.error("Alert Engine Sync Error:", error);
        });

    } catch (error) {
        console.error("Failed to initialize real-time alert listeners:", error);
    }
}

/**
 * Browser Notification Permission Handler for Desktop/Mobile Push Alerts
 */
export async function requestBrowserNotificationPermission() {
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notifications.");
        return;
    }

    if (Notification.permission === "granted") {
        return true;
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }
    return false;
}

/**
 * Fires a native browser notification when a high-risk threat matches
 */
export function triggerDesktopNotification(title, bodyText) {
    if (Notification.permission === "granted") {
        new Notification(`🚨 SCANGATE ALERT: ${title}`, {
            body: bodyText,
            icon: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=96&h=96&fit=crop"
        });
    }
}
