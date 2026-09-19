// admin.js
import { db } from './firebase-config.js';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const ALLOWED_STATUSES = ["pending", "under_review", "verified", "rejected", "resolved"];

export async function updateReportStatusWithAudit(reportId, previousStatus, newStatus, reason, adminUser) {
  if (!ALLOWED_STATUSES.includes(newStatus)) {
    return { success: false, error: "Invalid status value provided." };
  }

  try {
    const reportRef = doc(db, "reports", reportId);

    // Update Report Status
    await updateDoc(reportRef, {
      status: newStatus,
      reviewedBy: adminUser.uid,
      updatedAt: serverTimestamp()
    });

    // Detailed Audit Log Record
    await addDoc(collection(db, "auditLogs"), {
      adminUid: adminUser.uid,
      action: "UPDATE_REPORT_STATUS",
      targetType: "report",
      targetId: reportId,
      previousStatus: previousStatus,
      newStatus: newStatus,
      reason: reason || "No reason specified",
      timestamp: serverTimestamp()
    });

    return { success: true, message: `Report successfully updated to ${newStatus}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
