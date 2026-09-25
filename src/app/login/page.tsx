"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icon";
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
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-large">أ</div>
        <span className="eyebrow">أثري</span>
        <h1>شواهدك عندك، وترتيبها عند أثري</h1>
        <p>
          سجلي بحساب Google. أثري يطلب صلاحية محدودة للملفات
          التي ينشئها داخل Drive فقط.
        </p>

        {firebaseConfigured ? (
          <button
            className="primary-button full-button"
            onClick={login}
            disabled={loading}
          >
            {loading ? "جاري الربط…" : "الدخول وربط Google Drive"}
            <Icon name="chevron" size={18} />
          </button>
        ) : (
          <div className="setup-notice">
            الواجهة جاهزة. يلزم فقط إدخال إعدادات Firebase لتفعيل الدخول.
          </div>
        )}

        {error ? <p className="error-text">{error}</p> : null}

        <Link href="/" className="secondary-button full-button auth-preview">
          معاينة الواجهة
        </Link>

        <p className="auth-note">
          لا يطلب أثري صلاحية الاطلاع على كامل Google Drive.
        </p>
      </div>
    </main>
  );
}
