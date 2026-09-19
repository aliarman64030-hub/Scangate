// watchlist.js
import { db } from './firebase-config.js';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Add Identifier to User Watchlist
export async function addToWatchlist(currentUser, targetType, identifier) {
  try {
    const normalizedIdentifier = identifier.toLowerCase().trim();
    
    // Check if already in watchlist
    const q = query(
      collection(db, "watchlist"), 
      where("uid", "==", currentUser.uid),
      where("identifier", "==", normalizedIdentifier)
    );
    const existing = await getDocs(q);
    if (!existing.empty) {
      return { success: false, error: "This identifier is already in your watchlist." };
    }

    await addDoc(collection(db, "watchlist"), {
      uid: currentUser.uid,
      targetType: targetType,
      identifier: normalizedIdentifier,
      createdAt: serverTimestamp()
    });

    return { success: true, message: "Added to watchlist successfully." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Get User Watchlist
export async function getUserWatchlist(currentUser) {
  try {
    const q = query(collection(db, "watchlist"), where("uid", "==", currentUser.uid));
    const snapshot = await getDocs(q);
    let watchlist = [];
    snapshot.forEach((doc) => {
      watchlist.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, watchlist };
  } catch (error) {
    return { success: false, error: error.message };
  }
}