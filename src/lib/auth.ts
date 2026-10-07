import {
  GoogleAuthProvider,
  reauthenticateWithPopup,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_TOKEN_KEY = "athari_google_drive_access_token";
const DRIVE_TOKEN_TIME_KEY = "athari_google_drive_access_token_saved_at";
const DRIVE_TOKEN_UID_KEY = "athari_google_drive_access_token_uid";
const DRIVE_TOKEN_MAX_AGE_MS = 50 * 60 * 1000;

function provider(loginHint?: string | null) {
  const p = new GoogleAuthProvider();
  p.addScope(DRIVE_SCOPE);
  p.setCustomParameters(
    loginHint ? { prompt: "select_account", login_hint: loginHint } : { prompt: "select_account" }
  );
  return p;
}

function authCode(error: unknown) {
  return typeof error === "object" && error && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
}

/** A formal Arabic message for a failed Google sign-in; never the raw Firebase text. */
export function authErrorMessage(error: unknown) {
  switch (authCode(error)) {
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "أُغلقت نافذة تسجيل الدخول قبل اكتمالها. يُرجى المحاولة مرة أخرى.";
    case "auth/popup-blocked":
      return "منع المتصفح نافذة تسجيل الدخول. يُرجى السماح بالنوافذ المنبثقة لهذا الموقع ثم إعادة المحاولة.";
    case "auth/operation-not-supported-in-this-environment":
    case "auth/web-storage-unsupported":
      return "لا يدعم هذا المتصفح تسجيل الدخول. يُرجى فتح الرابط في Safari أو Chrome بدلًا من متصفح التطبيقات.";
    case "auth/network-request-failed":
      return "تعذر الاتصال بالإنترنت. يُرجى التحقق من الاتصال ثم إعادة المحاولة.";
    case "auth/unauthorized-domain":
      return "هذا النطاق غير مصرَّح له بتسجيل الدخول. يُرجى التواصل مع مسؤول أثري.";
    case "auth/too-many-requests":
      return "تكررت محاولات الدخول. يُرجى الانتظار قليلًا ثم إعادة المحاولة.";
    case "auth/user-disabled":
      return "هذا الحساب موقوف. يُرجى التواصل مع مسؤول أثري.";
    default:
      return "تعذر تسجيل الدخول الآن. يُرجى المحاولة مرة أخرى.";
  }
}

function saveDriveToken(token: string | null | undefined, uid: string) {
  if (typeof window !== "undefined" && token) {
    sessionStorage.setItem(DRIVE_TOKEN_KEY, token);
    sessionStorage.setItem(DRIVE_TOKEN_TIME_KEY, String(Date.now()));
    sessionStorage.setItem(DRIVE_TOKEN_UID_KEY, uid);
  }
}

export function clearStoredDriveToken() {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(DRIVE_TOKEN_KEY);
    sessionStorage.removeItem(DRIVE_TOKEN_TIME_KEY);
    sessionStorage.removeItem(DRIVE_TOKEN_UID_KEY);
  }
}

export function getStoredDriveToken() {
  if (typeof window === "undefined") return null;

  const token = sessionStorage.getItem(DRIVE_TOKEN_KEY);
  if (!token) return null;

  // A token belongs to the account that obtained it; never reuse it for another session.
  const currentUid = firebaseConfigured ? requireAuth().currentUser?.uid : undefined;
  if (!currentUid) return null; // Session not restored yet: keep the token, do not use it.
  const owner = sessionStorage.getItem(DRIVE_TOKEN_UID_KEY);
  const savedAt = Number(sessionStorage.getItem(DRIVE_TOKEN_TIME_KEY));
  if (
    owner !== currentUid ||
    !Number.isFinite(savedAt) ||
    savedAt <= 0 ||
    Date.now() - savedAt >= DRIVE_TOKEN_MAX_AGE_MS
  ) {
    clearStoredDriveToken();
    return null;
  }

  return token;
}

export async function signInWithGoogleAndDrive(): Promise<User> {
  // The popup must open directly from the tap: any await before it makes
  // Safari treat it as an unrequested pop-up and show a blocking prompt.
  // Local persistence is already the web default, so no setup call is needed.
  const result = await signInWithPopup(requireAuth(), provider());
  const credential = GoogleAuthProvider.credentialFromResult(result);
  saveDriveToken(credential?.accessToken, result.user.uid);
  return result.user;
}

export async function ensureDriveAccessToken(): Promise<string> {
  const existing = getStoredDriveToken();
  if (existing) return existing;

  const auth = requireAuth();
  const user = auth.currentUser;
  if (!user) throw new Error("AUTH_REQUIRED");

  // Re-authenticate the signed-in teacher only. A plain sign-in popup would
  // silently switch the session if another Google account were chosen.
  let result;
  try {
    result = await reauthenticateWithPopup(user, provider(user.email));
  } catch {
    // Closed popup, blocked popup or a different account (auth/user-mismatch):
    // the session stays as it was and the caller asks to sign in again.
    throw new Error("DRIVE_RECONNECT_REQUIRED");
  }
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const token = credential?.accessToken;

  if (!token) throw new Error("DRIVE_TOKEN_MISSING");
  saveDriveToken(token, user.uid);
  return token;
}

export async function logout() {
  clearStoredDriveToken();
  await signOut(requireAuth());
}
