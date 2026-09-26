"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { getStoredDriveToken, logout } from "@/lib/auth";
import { requireAuth } from "@/lib/firebase";

type PanelKey = "profile" | "framework" | "privacy" | "help" | null;

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<PanelKey>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), (nextUser) => {
      setUser(nextUser);
    });
  }, []);

  const year =
    process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  const displayName = user?.displayName?.trim() || "حساب المعلمة";
  const email = user?.email || "لم يظهر البريد";
  const initial = useMemo(
    () => displayName.replace(/\s+/g, "").charAt(0) || "أ",
    [displayName]
  );

  function toggle(next: Exclude<PanelKey, null>) {
    setPanel((current) => (current === next ? null : next));
  }

  async function signOutNow() {
    try {
      setBusy(true);
      await logout();
      router.replace("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="الحساب" subtitle="إعداداتك وبيانات ملفك">
      <section className="profile-card">
        <div className="avatar">{initial}</div>
        <div>
          <h1>{displayName}</h1>
          <p>{email}</p>
        </div>
      </section>

      <div className="settings-list">
        <button type="button" onClick={() => toggle("profile")}>
          <span>بيانات الملف المهني</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "profile" ? (
          <div className="settings-panel">
            <strong>الحساب المتصل</strong>
            <p>{displayName}</p>
            <p>{email}</p>
            <small>
              أثري يستخدم حساب Google لتسجيل الدخول وحفظ الشواهد في Drive.
            </small>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("framework")}>
          <span>السنة وإطار الأداء</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "framework" ? (
          <div className="settings-panel">
            <strong>السنة الحالية: {year}</strong>
            <p>إطار تقييم أداء المعلم الرسمي: 11 عنصرًا.</p>
            <small>
              لا يضيف أثري عناصر من عنده؛ التصنيف يعتمد على الإطار الموثق داخل المشروع.
            </small>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("privacy")}>
          <span>الخصوصية والمشاركة</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "privacy" ? (
          <div className="settings-panel">
            <strong>الأصل في Google Drive</strong>
            <p>
              الشاهد الأصلي يبقى في حسابك، وأثري يحتفظ بفهرس التحليل والاعتماد.
            </p>
            <small>
              حالة جلسة Drive الحالية:{" "}
              {getStoredDriveToken() ? "مرتبطة في هذه الجلسة" : "ستطلب إعادة الربط عند الحاجة"}.
            </small>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("help")}>
          <span>المساعدة</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "help" ? (
          <div className="settings-panel">
            <strong>المسار المختصر</strong>
            <p>1. أضيفي شاهدًا.</p>
            <p>2. راجعي الحقائق والتصنيفات.</p>
            <p>3. اختاري حتى 3 عناصر عند الحاجة.</p>
            <p>4. اعتمدي، وسيظهر الشاهد في «ملفي».</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="secondary-button full-button"
        onClick={signOutNow}
        disabled={busy}
      >
        {busy ? "جاري تسجيل الخروج…" : "تسجيل الخروج"}
      </button>
    </AppShell>
  );
}
