// pro-features.js - SCANGATE Pro Advanced Power Features
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. Cyber Cell / Police Report PDF Data Generator
export async function generateCyberCellReport(userId, targetIdentifier) {
  try {
    const normalizedTarget = targetIdentifier.toLowerCase().trim();
    const q = query(collection(db, "reports"), where("identifier", "==", normalizedTarget));
    const snapshot = await getDocs(q);
    
    let evidenceList = [];
    snapshot.forEach(doc => {
      evidenceList.push({ id: doc.id, ...doc.data() });
    });

    const legalReportData = {
      generatedForUserUid: userId,
      targetIdentifier: normalizedTarget,
      totalEvidenceRecords: evidenceList.length,
      incidents: evidenceList,
      generatedAt: new Date().toISOString(),
      disclaimer: "Generated via SCANGATE Pro Intelligence. Official format for Cyber Crime Cell submission."
    };

    return { success: true, report: legalReportData, message: "Cyber Cell legal complaint package generated." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 2. Watchlist Auto-Monitoring & Instant Alerts Check
export async function runWatchlistAutoMonitoring(userId) {
  try {
    const watchQuery = query(collection(db, "watchlist"), where("uid", "==", userId));
    const watchSnap = await getDocs(watchQuery);
    
    let triggeredAlerts = [];
    for (const watchDoc of watchSnap.docs) {
      const watchData = watchDoc.data();
      const reportQuery = query(collection(db, "reports"), where("identifier", "==", watchData.identifier));
      const reportSnap = await getDocs(reportQuery);
      
      if (!reportSnap.empty) {
        triggeredAlerts.push({
          identifier: watchData.identifier,
          reportsCount: reportSnap.size,
          riskStatus: "HIGH_ALERT"
        });
      }
    }
    return { success: true, alerts: triggeredAlerts };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 3. Detailed Scam Timeline & Pattern Analysis
export async function getScamTimelineAnalysis(targetIdentifier) {
  try {
    const normalizedTarget = targetIdentifier.toLowerCase().trim();
    const q = query(collection(db, "reports"), where("identifier", "==", normalizedTarget));
    const snapshot = await getDocs(q);
    
    let timeline = [];
    let categoriesCount = {};
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      timeline.push({
        category: data.category,
        description: data.description,
        timestamp: data.createdAt
      });
      categoriesCount[data.category] = (categoriesCount[data.category] || 0) + 1;
    });

    const patternType = timeline.length > 3 ? "High-Frequency Organized Fraud Ring" : "Targeted Isolated Incident";

    return {
      success: true,
      analysis: {
        target: normalizedTarget,
        totalReports: timeline.length,
        pattern: patternType,
        categoryBreakdown: categoriesCount,
        timelineEvents: timeline
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 4. Verified Pro Badge UI Injector
export function renderProAgentBadge() {
  return `
    <span class="badge" style="background: linear-gradient(135deg, #635BFF, #00F2FE); color: #fff; font-weight: 700; padding: 4px 8px; border-radius: 4px; font-size: 0.75rem;">
      🛡️ Verified Pro Agent
    </span>
  `;
}