// usage.js
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function checkDailyUsageLimit(currentUser) {
  try {
    const todayStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const usageDocId = `${currentUser.uid}_${todayStr}`;
    
    const usageDoc = await getDoc(doc(db, "usage", usageDocId));
    if (!usageDoc.exists()) {
      return { searchCount: 0, limitExceeded: false };
    }

    const data = usageDoc.data();
    const currentCount = data.searchCount || 0;
    
    // Assuming free tier limit is 5 searches per day
    const LIMIT = 5;
    
    return {
      searchCount: currentCount,
      limitExceeded: currentCount >= LIMIT
    };
  } catch (error) {
    console.error("Usage check error:", error);
    return { searchCount: 0, limitExceeded: false };
  }
}