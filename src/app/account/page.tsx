"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { getStoredDriveToken, logout } from "@/lib/auth";
import { requireAuth } from "@/lib/firebase";
import { cleanupDuplicateEvidence } from "@/lib/firestore";

type PanelKey =
  | "profile"
  | "framework"
  | "privacy"
  | "maintenance"
  | "help"
  | null;

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [panel, setPanel] = useState<PanelKey>(null);
  const [busy, setBusy] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), setUser);
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

  async function cleanDuplicates() {
    if (!user) return;

    const confirmation = `سيحتفظ أثري بأفضل سجل لكل شاهد في السنة نفسها، ويؤرشف المحاولات المكررة القديمة فقط.

لن يحذف أي ملف من Google Drive. هل نكمل؟`;

    if (!window.confirm(confirmation)) return;

    try {
      setBusy(true);
      setCleanupMessage("جاري فحص المحاولات المكررة…");
      const result = await cleanupDuplicateEvidence(user.uid);
      setCleanupMessage(
        result.archivedCount
          ? `تمت أرشفة ${result.archivedCount} محاولة مكررة. الملفات الأصلية في Drive لم تُحذف.`
          : "لا توجد محاولات مكررة تحتاج تنظيفًا الآن."
      );
    } catch {
      setCleanupMessage(
        "تعذر إكمال التنظيف الآن. لم يتم حذف أي ملف من Drive."
      );
    } finally {
      setBusy(false);
    }
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

  const panelStyle = { padding: 16, background: "#f1f4ef" };

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
          <div style={panelStyle}>
            <strong>الحساب المتصل</strong>
            <p>{displayName}</p>
            <p>{email}</p>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("framework")}>
          <span>السنة وإطار الأداء</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "framework" ? (
          <div style={panelStyle}>
            <strong>السنة الحالية: {year}</strong>
            <p>إطار تقييم أداء المعلم الرسمي: 11 عنصرًا.</p>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("privacy")}>
          <span>الخصوصية والمشاركة</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "privacy" ? (
          <div style={panelStyle}>
            <strong>الأصول في Google Drive</strong>
            <p>
              يمكن أن يتكون الشاهد من ملف واحد أو عدة ملفات. حذف سجل من
              أثري لا يحذف الأصول من Drive.
            </p>
            <small>
              جلسة Drive: {getStoredDriveToken()
                ? "مرتبطة الآن"
                : "ستطلب إعادة الربط عند الحاجة"}
            </small>
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("maintenance")}>
          <span>تنظيف المحاولات المكررة</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "maintenance" ? (
          <div style={panelStyle}>
            <strong>تنظيف آمن</strong>
            <p>
              يحتفظ أثري بأفضل سجل للشاهد الواحد، ويؤرشف المحاولات الأقدم.
              لا يحذف أي أصل من Drive.
            </p>
            <button
              type="button"
              className="secondary-button full-button"
              onClick={cleanDuplicates}
              disabled={busy}
              style={{ marginTop: 10 }}
            >
              {busy ? "جاري التنظيف…" : "تنظيف الآن"}
            </button>
            {cleanupMessage ? (
              <p style={{ marginTop: 10 }}>{cleanupMessage}</p>
            ) : null}
          </div>
        ) : null}

        <button type="button" onClick={() => toggle("help")}>
          <span>المساعدة</span>
          <Icon name="chevron" size={18} />
        </button>
        {panel === "help" ? (
          <div style={panelStyle}>
            <p>
              يمكنك اختيار حتى 8 صور أو ملفات معًا؛ يعاملها أثري كشاهد واحد،
              ثم تقررين التصنيفات المناسبة قبل الاعتماد.
            </p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="secondary-button full-button"
        onClick={signOutNow}
        disabled={busy}
      >
        {busy ? "جاري التنفيذ…" : "تسجيل الخروج"}
      </button>
    </AppShell>
  );
}
