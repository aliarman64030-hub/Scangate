// Backend / Cloud Function Logic Concept for Usage & Search Verification
export async function verifyAndIncrementSearch(db, userId) {
  const todayStr = new Date().toISOString().split('T')[0];
  const usageDocId = `${userId}_${todayStr}`;
  const usageRef = db.collection("usage").doc(usageDocId);

  // Transaction to safely increment usage counter server-side
  return await db.runTransaction(async (transaction) => {
    const usageDoc = await transaction.get(usageRef);
    let currentCount = 0;

    if (usageDoc.exists) {
      currentCount = usageDoc.data().searchCount || 0;
    }

    const DAILY_LIMIT = 5; // Free tier limit
    if (currentCount >= DAILY_LIMIT) {
      throw new Error("Daily search limit exceeded. Please upgrade to Pro.");
    }

    transaction.set(usageRef, {
      uid: userId,
      date: todayStr,
      searchCount: currentCount + 1
    }, { merge: true });

    return { allowed: true, remaining: DAILY_LIMIT - (currentCount + 1) };
  });
}