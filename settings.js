// settings.js
import { db } from './firebase-config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function updateUserSettings(currentUser, rawData) {
  try {
    const userRef = doc(db, "users", currentUser.uid);
    
    // WHITELISTING ALLOWED FIELDS ONLY (Prevents privilege escalation)
    const allowedUpdates = {
      displayName: rawData.displayName ? rawData.displayName.trim() : "",
      avatar: rawData.avatar || "",
      notificationPreferences: {
        emailAlerts: Boolean(rawData.notificationPreferences?.emailAlerts),
        pushAlerts: Boolean(rawData.notificationPreferences?.pushAlerts)
      },
      theme: rawData.theme === "light" ? "light" : "dark",
      updatedAt: new Date()
    };

    await updateDoc(userRef, allowedUpdates);
    return { success: true, message: "Settings updated securely." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}