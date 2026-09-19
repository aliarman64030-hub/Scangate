// ==========================================
// SCANGATE GLOBAL FIREBASE CONFIG
// Project ID: scangate-74754
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = {
  // Firebase Console -> Project Settings -> Web App -> 'Config' radio button se apni asli API key yahan dalein
  apiKey: "AIzaSyCAkQCqiqyPzbun3cdR7QK4phYPQ5vdccA",
  authDomain: "scangate-74754.firebaseapp.com",
  projectId: "scangate-74754",
  storageBucket: "scangate-74754.firebasestorage.app",
  messagingSenderId: "1048506380411",
  appId: "1:1048506380411:web:86dd8076bab1184d6d32de"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// Export Services for App Modules
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
