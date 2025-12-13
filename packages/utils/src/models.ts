/**
 * Shared model types for Blibliki
 * These can be used across browser and Node.js environments
 */

export type IDevice = {
  id: string;
  token: string;
  name: string;
  patchId: string | null;
  userId: string;
};

// Firebase config type
export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};
