import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

function getFirebaseConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDPjiUs5TkIHozvPwqXkGzmtS1DoR1GXp8";
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "expedition-go-tours-domain.firebaseapp.com";
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || "expedition-go-tours-domain";
  const appId = import.meta.env.VITE_FIREBASE_APP_ID || "1:729385582725:web:0f6c3b96d652462d4669ec";
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "729385582725";
  return { apiKey, authDomain, projectId, appId, messagingSenderId };
}

const firebaseConfig = getFirebaseConfig();

const hasValidConfig = !!(firebaseConfig.apiKey && firebaseConfig.projectId);

let app = null;
let auth = null;
let googleProvider = null;
let initError = null;

if (hasValidConfig) {
  try {
    const existingApp = getApps().length > 0 ? getApps()[0] : null;
    app = existingApp || initializeApp(firebaseConfig);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });
  } catch (err) {
    initError = err.message || String(err);
  }
} else {
  initError = "Firebase config missing";
}

export function getFirebaseStatus() {
  return { ready: !!(auth && googleProvider), error: initError, hasConfig: hasValidConfig };
}

export {
  auth,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
};

export default app;