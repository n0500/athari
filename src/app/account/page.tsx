"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AthShell, ElementArt, Glyph, Notice } from "@/components/athari-ui/Ui";
import { SHARE_SYNC_PENDING_MESSAGE, syncShareWithApproved } from "@/lib/shareSync";
import { HeroWave } from "@/components/athari-ui/Art";
import { getStoredDriveToken, logout } from "@/lib/auth";
import { requireAuth } from "@/lib/firebase";
import { cleanupDuplicateEvidence } from "@/lib/firestore";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { MANDATORY_REQUIREMENT_COUNT } from "@/data/mandatory-requirements";

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
  const elementCount = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
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
      let shareNote = "";
      if (result.archivedCount) {
        const sync = await syncShareWithApproved(user.uid).catch(() => "revoke_pending" as const);
        if (sync === "revoke_pending") shareNote = ` ${SHARE_SYNC_PENDING_MESSAGE}`;
      }
      setCleanupMessage(
        result.archivedCount
          ? `أُرشفت ${result.archivedCount} محاولة مكررة، ولم يُحذف أي ملف من Google Drive.${shareNote}`
          : "لا توجد محاولات مكررة."
      );
    } catch {
      setCleanupMessage(
        "تعذر إكمال التنظيف الآن، ولم يُحذف أي ملف من Google Drive."
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
    art: string;
    tone: "lav" | "sky" | "cream" | "pink" | "mint";
  }> = [
    { key: "profile", title: "الهوية المهنية", subtitle: "بياناتك المهنية ونبذتك المختصرة", art: "people", tone: "lav" },
    { key: "framework", title: "السنة وإطار الأداء", subtitle: `${year} · ${elementCount} عنصرًا · ${MANDATORY_REQUIREMENT_COUNT} بند متابعة`, art: "planner", tone: "sky" },
    { key: "privacy", title: "الخصوصية والمشاركة", subtitle: "Google Drive ومشاركة ملف الأداء", art: "clipboard", tone: "mint" },
    { key: "maintenance", title: "تنظيف المحاولات المكررة", subtitle: "أرشفة آمنة دون حذف الأصول", art: "report", tone: "pink" },
    { key: "help", title: "المساعدة", subtitle: "المسار المختصر لاستخدام أثري", art: "bulb", tone: "cream" },
  ];

  return (
    <AthShell title="الحساب" subtitle="إدارة الحساب وخيارات المشاركة.">
      <section className="ath-hero">
        <div className="ath-profile">
          <span className="av">{initial}</span>
          <div className="ath-hero-text">
            <span className="ath-pill-out"><Glyph name="check" size={16} />الحساب متصل</span>
            <h1 style={{ marginTop: 6 }}>{displayName}</h1>
            <p>{email}</p>
          </div>
        </div>
        <HeroWave />
      </section>

      <div className="ath-settings">
        {panels.map((entry) => (
          <div className={`ath-set ${panel === entry.key ? "open" : ""}`} key={entry.key}>
            <button type="button" onClick={() => toggle(entry.key)} aria-expanded={panel === entry.key}>
              <span className={`ic tone-${entry.tone}`}><ElementArt art={entry.art} /></span>
              <span className="tx">
                <strong>{entry.title}</strong>
                <small>{entry.subtitle}</small>
              </span>
              <Glyph name="chevLeft" size={16} className="chev" />
            </button>

            {panel === entry.key ? (
              <div className="body">
                {entry.key === "profile" ? (
                  <>
                    <strong>حساب Google المستخدم في أثري</strong>
                    <span>{displayName}</span>
                    <span dir="ltr" style={{ textAlign: "right" }}>{email}</span>
                    <span>تُعرض في مشاركة ملف الأداء البيانات المهنية التي تختارين حفظها فقط، ولا يظهر البريد أو رقم الجوال.</span>
                    <Link className="ath-btn primary fit" href="/profile"><Glyph name="user" size={17} /> تعديل الهوية المهنية</Link>
                  </>
                ) : null}

                {entry.key === "framework" ? (
                  <>
                    <strong>العام الدراسي {year}</strong>
                    <span>تُصنَّف الشواهد وفق إطار تقييم أداء المعلم الرسمي ({elementCount} عنصرًا)، مع متابعة {MANDATORY_REQUIREMENT_COUNT} بندًا إلزاميًا مرتبطة بهذه العناصر.</span>
                    <Link className="ath-link" href="/preview">معاينة ملف الأداء</Link>
                  </>
                ) : null}

                {entry.key === "privacy" ? (
                  <>
                    <strong>الملفات الأصلية في Google Drive الخاص بك</strong>
                    <span>يمكن رفع ملفات جديدة إلى أثري، أو ربط ملف أو مجلد من Google Drive. الملفات المرتبطة تبقى في موقعها الأصلي.</span>
                    <span>يعرض رابط المشاركة الشواهد المعتمدة فقط دون الوصول إلى بقية ملفاتك أو المجلد كاملًا.</span>
                    <small>
                      حالة Google Drive: {getStoredDriveToken() ? "متصل" : "يُطلب تسجيل Google عند الحاجة"}
                    </small>
                    <Link className="ath-link" href="/portfolio?share=1">إدارة مشاركة ملف الأداء</Link>
                  </>
                ) : null}

                {entry.key === "maintenance" ? (
                  <>
                    <strong>تنظيف آمن</strong>
                    <span>يحتفظ أثري بأفضل سجل للشاهد الواحد، ويؤرشف المحاولات الأقدم دون حذف الملفات الأصلية.</span>
                    <button type="button" className="ath-btn outline" onClick={cleanDuplicates} disabled={busy}>
                      <Glyph name="archive" size={17} />
                      {busy ? "جاري التنظيف…" : "تنظيف الآن"}
                    </button>
                    {cleanupMessage ? <Notice>{cleanupMessage}</Notice> : null}
                  </>
                ) : null}

                {entry.key === "help" ? (
                  <>
                    <ol>
                      <li>أكملي الهوية المهنية مرة واحدة.</li>
                      <li>أضيفي شاهدًا من الجهاز أو Google Drive.</li>
                      <li>راجعي العنصر وبنود المتابعة التي يثبتها الشاهد.</li>
                      <li>اعتمدي الشاهد.</li>
                      <li>عايني ملف الأداء أو شاركيه.</li>
                    </ol>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" className="ath-btn danger block" onClick={signOutNow} disabled={busy}>
        <Glyph name="logout" />
        {busy ? "جاري التنفيذ…" : "تسجيل الخروج"}
      </button>

      <div className="ath-legal">
        <Link href="/privacy">سياسة الخصوصية</Link>
        <span>·</span>
        <Link href="/terms">شروط الاستخدام</Link>
      </div>
    </AthShell>
  );
}
