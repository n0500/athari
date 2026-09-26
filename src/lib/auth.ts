import {
  browserLocalPersistence,
  GoogleAuthProvider,
  setPersistence,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { requireAuth } from "@/lib/firebase";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_TOKEN_KEY = "athari_google_drive_access_token";

function provider() {
  const p = new GoogleAuthProvider();
  p.addScope(DRIVE_SCOPE);
  p.setCustomParameters({ prompt: "select_account" });
  return p;
}

function saveDriveToken(token?: string | null) {
  if (typeof window !== "undefined" && token) {
    sessionStorage.setItem(DRIVE_TOKEN_KEY, token);
  }
}

export function clearStoredDriveToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(DRIVE_TOKEN_KEY);
  }
}

export function getStoredDriveToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(DRIVE_TOKEN_KEY);
}

export async function signInWithGoogleAndDrive(): Promise<User> {
  const auth = requireAuth();
  await setPersistence(auth, browserLocalPersistence);

  const result = await signInWithPopup(auth, provider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  saveDriveToken(credential?.accessToken);
  return result.user;
}

export async function ensureDriveAccessToken(): Promise<string> {
  const existing = getStoredDriveToken();
  if (existing) return existing;

  const auth = requireAuth();
  if (!auth.currentUser) throw new Error("AUTH_REQUIRED");

  const result = await signInWithPopup(auth, provider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) throw new Error("DRIVE_TOKEN_MISSING");
  saveDriveToken(token);
  return token;
}

export async function logout() {
  clearStoredDriveToken();
  await signOut(requireAuth());
}
