import { initializeFirebase, isFirebaseInitialized } from "@blibliki/models";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// The config is baked in at build time, so a device build without an .env
// would otherwise fail deep inside Firestore with nothing on screen.
export function isFirebaseConfigured() {
  return Object.values(firebaseConfig).every(Boolean);
}

export function initializeFirebaseOnce() {
  if (!isFirebaseConfigured() || isFirebaseInitialized()) {
    return;
  }

  initializeFirebase(firebaseConfig);
}
