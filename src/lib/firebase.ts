import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";

const publicFirebaseConfig = {
  apiKey: "AIzaSyCbdcojVVJN44dWekq1WZFRQzYnN-hXJl0",
  authDomain: "athari-f07a7.firebaseapp.com",
  projectId: "athari-f07a7",
  appId: "1:107135331394:web:e1475a5aa9bac09516d1db",
};

const config = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    publicFirebaseConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    publicFirebaseConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    publicFirebaseConfig.projectId,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    publicFirebaseConfig.appId,
};

export const firebaseConfigured = Boolean(
  config.apiKey && config.authDomain && config.projectId && config.appId
);

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;

if (firebaseConfigured) {
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export function requireAuth(): Auth {
  if (!auth) throw new Error("FIREBASE_NOT_CONFIGURED");
  return auth;
}

export function requireDb(): Firestore {
  if (!db) throw new Error("FIREBASE_NOT_CONFIGURED");
  return db;
}
