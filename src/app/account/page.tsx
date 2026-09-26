"use client";

import Link from "next/link";
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

  const year = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";
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

  const panels: Array<{
    key: Exclude<PanelKey, null>;
    title: string;
    subtitle: string;
    icon: "user" | "grid" | "shield" | "archive" | "sparkle";
  }> = [
    { key: "profile", title: "بيانات الملف المهني", subtitle: "الحساب المتصل", icon: "user" },
    { key: "framework", title: "السنة وإطار الأداء", subtitle: `${year} · 11 عنصرًا`, icon: "grid" },
    { key: "privacy", title: "الخصوصية والمشاركة", subtitle: "Google Drive وروابط العرض", icon: "shield" },
    { key: "maintenance", title: "تنظيف المحاولات المكررة", subtitle: "أرشفة آمنة دون حذف الأصول", icon: "archive" },
    { key: "help", title: "المساعدة", subtitle: "المسار المختصر لاستخدام أثري", icon: "sparkle" },
  ];

  return (
    <AppShell title="الحساب" subtitle="إعداداتك وبيانات ملفك">
      <section className="account-hero">
        <div className="avatar premium-avatar">{initial}</div>
        <div>
          <span className="eyebrow light">الحساب المتصل</span>
          <h1>{displayName}</h1>
          <p>{email}</p>
        </div>
        <span className="account-badge">
          <Icon name="check" size={15} /> متصل
        </span>
      </section>

      <div className="settings-list modern-settings">
        {panels.map((entry) => (
          <div className="settings-item" key={entry.key}>
            <button type="button" onClick={() => toggle(entry.key)}>
              <span className="settings-row-icon"><Icon name={entry.icon} size={19} /></span>
              <span className="settings-row-copy">
                <strong>{entry.title}</strong>
                <small>{entry.subtitle}</small>
              </span>
              <Icon name="chevron" size={18} />
            </button>

            {panel === entry.key ? (
              <div className="settings-panel">
                {entry.key === "profile" ? (
                  <>
                    <strong>حساب Google المستخدم في أثري</strong>
                    <p>{displayName}</p>
                    <p>{email}</p>
                  </>
                ) : null}

                {entry.key === "framework" ? (
                  <>
                    <strong>العام الدراسي {year}</strong>
                    <p>
                      أثري يصنف الشواهد على إطار تقييم أداء المعلم الرسمي المكوّن من 11 عنصرًا.
                    </p>
                    <Link className="text-link" href="/preview">معاينة تغطية العناصر</Link>
                  </>
                ) : null}

                {entry.key === "privacy" ? (
                  <>
                    <strong>الأصول تبقى في Google Drive</strong>
                    <p>
                      رابط المديرة يُنشأ عند طلبك فقط، ويقتصر على الشواهد المعتمدة داخل مجلد مشاركة منفصل.
                    </p>
                    <small>
                      جلسة Drive: {getStoredDriveToken()
                        ? "مرتبطة الآن"
                        : "ستطلب إعادة الربط عند الحاجة"}
                    </small>
                    <Link className="text-link" href="/portfolio">إدارة المشاركة من ملفي</Link>
                  </>
                ) : null}

                {entry.key === "maintenance" ? (
                  <>
                    <strong>تنظيف آمن</strong>
                    <p>
                      يحتفظ أثري بأفضل سجل للشاهد الواحد، ويؤرشف المحاولات الأقدم دون حذف الملفات الأصلية.
                    </p>
                    <button
                      type="button"
                      className="secondary-button full-button"
                      onClick={cleanDuplicates}
                      disabled={busy}
                    >
                      <Icon name="archive" size={17} />
                      {busy ? "جاري التنظيف…" : "تنظيف الآن"}
                    </button>
                    {cleanupMessage ? <p className="settings-result">{cleanupMessage}</p> : null}
                  </>
                ) : null}

                {entry.key === "help" ? (
                  <>
                    <strong>أربع خطوات فقط</strong>
                    <ol className="help-steps">
                      <li>ارفعي ملفًا أو عدة ملفات لنفس الشاهد.</li>
                      <li>راجعي ما فهمه أثري والتصنيفات المقترحة.</li>
                      <li>اعتمدي الشاهد والتصنيف الأساسي.</li>
                      <li>عايني ملفك أو أنشئي رابط مشاركة للمديرة.</li>
                    </ol>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="legal-links">
        <Link href="/privacy">سياسة الخصوصية</Link>
        <span>·</span>
        <Link href="/terms">شروط الاستخدام</Link>
      </div>

      <button
        type="button"
        className="secondary-button full-button signout-button"
        onClick={signOutNow}
        disabled={busy}
      >
        <Icon name="user" size={18} />
        {busy ? "جاري التنفيذ…" : "تسجيل الخروج"}
      </button>
    </AppShell>
  );
}
