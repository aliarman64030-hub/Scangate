// auth.js
import { auth, db } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const googleProvider = new GoogleAuthProvider();

// Register with Email/Password & Send Verification
export async function registerUser(email, password) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await sendEmailVerification(user);

    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      role: "user",
      createdAt: serverTimestamp(),
      status: "active"
    });

    return { success: true, message: "Registered successfully. Verification email sent." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Google Sign-In
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        role: "user",
        createdAt: serverTimestamp(),
        status: "active"
      });
    }

    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Login User
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Password Reset
export async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, message: "Password reset link sent to your email." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Secure Account Deletion (Requires Re-authentication)
export async function deleteUserAccount(password) {
  try {
    const user = auth.currentUser;
    if (!user) return { success: false, error: "No active user session." };

    // Re-authenticate user before deleting for security
    const credential = EmailAuthProvider.credential(user.email, password);
    await reauthenticateWithCredential(user, credential);

    // Delete Firestore profile document
    await deleteDoc(doc(db, "users", user.uid));

    // Delete Auth Account
    await deleteUser(user);
    return { success: true, message: "Account permanently deleted." };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Logout
export async function logoutUser() {
  await signOut(auth);
  window.location.href = "auth.html";
}
