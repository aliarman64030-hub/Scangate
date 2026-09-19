// Backend / Admin context or secure callable function for account termination
import { db, auth } from './firebase-config.js';
import { doc, deleteDoc, collection, query, where, getDocs, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function executeSecureAccountCleanup(userId) {
  try {
    // 1. Delete user watchlist items
    const watchlistQuery = query(collection(db, "watchlist"), where("uid", "==", userId));
    const watchlistSnap = await getDocs(watchlistQuery);
    const watchlistDeletions = watchlistSnap.docs.map(d => deleteDoc(d.ref));

    // 2. Delete notifications
    const notifQuery = query(collection(db, "notifications"), where("uid", "==", userId));
    const notifSnap = await getDocs(notifQuery);
    const notifDeletions = notifSnap.docs.map(d => deleteDoc(d.ref));

    // 3. Anonymize historical reports instead of hard deletion (Preserving platform scam-reporting integrity)
    const reportsQuery = query(collection(db, "reports"), where("reporterUid", "==", userId));
    const reportsSnap = await getDocs(reportsQuery);
    const reportAnonymizations = reportsSnap.docs.map(d => updateDoc(d.ref, { reporterUid: "DELETED_USER_ANONYMIZED" }));

    // Execute sub-collection cleanups in parallel
    await Promise.all([...watchlistDeletions, ...notifDeletions, ...reportAnonymizations]);

    // 4. Delete core user profile document
    await deleteDoc(doc(db, "users", userId));

    return { success: true, message: "Account data successfully cleaned up and anonymized." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}