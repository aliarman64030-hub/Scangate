// dashboard-banner.js - Handles Pro upgrade promotional ad banner on login/dashboard
import { db } from './firebase-config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

export async function renderProPromoBanner(userId, containerElementId) {
  const container = document.getElementById(containerElementId);
  if (!container) return;

  try {
    // Check user subscription status from database
    const userDocRef = doc(db, "users", userId);
    const userSnap = await getDoc(userDocRef);
    
    let isPro = false;
    if (userSnap.exists() && userSnap.data().isPro === true) {
      isPro = true;
    }

    if (isPro) {
      // Agar user pehle se Pro hai, toh Pro welcome badge dikhayein
      container.innerHTML = `
        <div class="sc-card mb-20" style="background: linear-gradient(135deg, rgba(99,91,255,0.15), rgba(0,242,254,0.15)); border: 1px solid var(--accent); text-align: center; padding: 15px;">
          <h3 style="font-size: 1rem; color: var(--accent); margin-bottom: 4px;">🛡️ SCANGATE Pro Active</h3>
          <p class="text-muted" style="font-size: 0.8rem;">You have full access to Cyber Cell PDF reports, AI pattern analysis, and unlimited lookups.</p>
        </div>
      `;
    } else {
      // Agar user Free plan par hai, toh high-value promotional Ad banner dikhayein
      container.innerHTML = `
        <div class="sc-card mb-20 promo-ad-banner" style="background: linear-gradient(135deg, #121212, #1a1a2e); border: 2px dashed #635BFF; position: relative; overflow: hidden; padding: 18px;">
          <div style="position: absolute; top: 10px; right: 12px;">
            <span class="badge" style="background: #635BFF; color: #fff; font-size: 0.65rem; padding: 2px 6px; border-radius: 4px;">LIMITED OFFER</span>
          </div>
          <h3 style="font-size: 1.05rem; margin-bottom: 6px; color: #fff;">🚀 Upgrade to SCANGATE Pro</h3>
          <p class="text-muted" style="font-size: 0.8rem; line-height: 1.4; margin-bottom: 12px;">
            Unlock <b>Cyber Cell PDF Reports</b>, <b>24/7 Watchlist Auto-Monitoring</b>, <b>Scam Pattern Timeline</b>, and <b>Unlimited Lookups</b> for just ₹149/mo ($4 USD).
          </p>
          <div style="display: flex; gap: 10px;">
            <button onclick="location.href='checkout.html'" class="btn-primary" style="flex: 1; padding: 10px; font-size: 0.85rem; background: #635BFF;">Upgrade Now (₹149)</button>
            <button onclick="dismissPromoBanner()" class="btn-secondary" style="padding: 10px; font-size: 0.85rem; background: transparent; border: 1px solid var(--text-muted); color: var(--text-muted);">Later</button>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error("Error rendering banner:", error);
  }
}

window.dismissPromoBanner = function() {
  const banner = document.querySelector('.promo-ad-banner');
  if (banner) banner.style.display = 'none';
};