"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Glyph, Notice } from "@/components/athari-ui/Ui";
import { HeroArt } from "@/components/athari-ui/Art";
import { firebaseConfigured } from "@/lib/firebase";
import { signInWithGoogleAndDrive } from "@/lib/auth";
import { ensureUserProfile } from "@/lib/firestore";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function login() {
    try {
      setLoading(true);
      setError("");
      const user = await signInWithGoogleAndDrive();
      await ensureUserProfile(user.uid, {
        displayName: user.displayName,
        email: user.email,
      });
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر تسجيل الدخول");
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
            <button type="button" className="ath-btn primary block" onClick={login} disabled={loading}>
              {loading ? "جاري تسجيل الدخول…" : "تسجيل الدخول بحساب Google"}
              <Glyph name="chevLeft" size={18} />
            </button>
          ) : (
            <Notice>تسجيل الدخول غير مفعّل: إعدادات Firebase غير مكتملة.</Notice>
          )}

          {error ? <Notice tone="error">{error}</Notice> : null}

          <Link href="/" className="ath-btn outline block">معاينة الواجهة</Link>

        </div>
      </main>
    </div>
  );
}
