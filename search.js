// search.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function searchIdentifier(queryIdentifier) {
  const normalizedQuery = queryIdentifier.toLowerCase().trim();
  const reportsRef = collection(db, "reports");

  const q = query(reportsRef, where("identifier", "==", normalizedQuery));
  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return {
      status: "No Verified Risk Found",
      riskLevel: "Low",
      disclaimer: "No verified risk found in SCANGATE's current database. This does not guarantee that the identifier is 100% safe.",
      reportsCount: 0,
      reports: []
    };
  }

  let sanitizedReports = [];
  let isVerifiedRisk = false;

  querySnapshot.forEach((docSnap) => {
    const docData = docSnap.data();
    if (docData.status === "verified") {
      isVerifiedRisk = true;
    }
    // Strict sanitization: Exposing only safe public fields
    sanitizedReports.push({
      identifier: docData.identifier,
      targetType: docData.targetType,
      category: docData.category,
      status: docData.status,
      createdAt: docData.createdAt
    });
  });

  return {
    status: isVerifiedRisk ? "VERIFIED RISK" : "UNDER REVIEW / REPORTED",
    riskLevel: isVerifiedRisk ? "High" : "Medium",
    reportsCount: sanitizedReports.length,
    reports: sanitizedReports
  };
}
