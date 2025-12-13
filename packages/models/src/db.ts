import { type FirebaseApp, initializeApp } from "firebase/app";
import { type Firestore, getFirestore } from "firebase/firestore";

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

let firebaseConfig: FirebaseConfig | undefined;
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export const initializeFirebase = (config: FirebaseConfig) => {
  firebaseConfig = config;
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
};

export const getApp = (): FirebaseApp => {
  if (!app) throw Error("You have to initialize db first");

  return app;
};

export const getDb = (): Firestore => {
  if (!db) throw Error("You have to initialize db first");

  return db;
};
