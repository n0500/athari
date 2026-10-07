"use client";

import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Glyph, Notice } from "@/components/athari-ui/Ui";
import { HeroArt } from "@/components/athari-ui/Art";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { authErrorMessage, signInWithGoogleAndDrive } from "@/lib/auth";
import { safeNextPath } from "@/components/AuthGate";
import { ensureUserProfile } from "@/lib/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(firebaseConfigured);
  // While the button flow is signing in, it does the redirect itself (after the profile is saved).
  const signingIn = useRef(false);

  function nextPath() {
    return safeNextPath(new URLSearchParams(window.location.search).get("next"));
  }

  // Already signed in (e.g. the login page was bookmarked): go straight in.
  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(requireAuth(), (user) => {
      if (signingIn.current) return;
      if (user) router.replace(nextPath());
      else setChecking(false);
    });
  }, [router]);

  async function login() {
    try {
      signingIn.current = true;
      setLoading(true);
      setError("");
      const user = await signInWithGoogleAndDrive();
      await ensureUserProfile(user.uid, {
        displayName: user.displayName,
        email: user.email,
      });
      router.replace(nextPath());
    } catch (e) {
      signingIn.current = false;
      setError(authErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="ath">
      <main className="ath-auth">
        <div className="ath-auth-card">
          <div className="ath-brand">
            <svg viewBox="0 0 48 40" width="48" height="40" aria-hidden>
              <path d="M4 4l18 6v28L4 32z" fill="#2f7df2" />
              <path d="M26 10l18-6v28l-18 6z" fill="#f6a53c" />
              <path d="M22 10h4v28h-4z" fill="#1b4fb8" />
            </svg>
            أثري
          </div>
          <div className="ath-auth-art"><HeroArt kind="folders" /></div>
          <h1>ملف الأداء المهني</h1>
          <p>
            تسجيل الدخول بحساب Google. يصل أثري إلى الملفات التي ينشئها في
            Google Drive فقط.
          </p>

          {firebaseConfigured ? (
            <button type="button" className="ath-btn primary block" onClick={login} disabled={loading || checking}>
              {checking ? "جاري التحقق…" : loading ? "جاري تسجيل الدخول…" : "تسجيل الدخول بحساب Google"}
              <Glyph name="chevLeft" size={18} />
            </button>
          ) : (
            <Notice>تسجيل الدخول غير مفعّل: إعدادات Firebase غير مكتملة.</Notice>
          )}

          {error ? <Notice tone="error">{error}</Notice> : null}

        </div>
      </main>
    </div>
  );
}
