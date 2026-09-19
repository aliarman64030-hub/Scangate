// notifications.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function fetchUserNotifications(currentUser) {
  try {
    const q = query(collection(db, "notifications"), where("uid", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    let notifications = [];
    
    snapshot.forEach((docItem) => {
      notifications.push({ id: docItem.id, ...docItem.data() });
    });

    return { success: true, notifications };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, { read: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}