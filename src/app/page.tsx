"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { EvidenceRecord } from "@/types/athari";

function coveredIds(items: EvidenceRecord[]) {
  const ids = new Set<string>();
  for (const item of items) {
    const approved = item.approvedContent;
    if (!approved) continue;
    if (approved.classifications?.length) {
      approved.classifications.forEach((entry) => ids.add(entry.elementId));
    } else if (approved.elementId) {
      ids.add(approved.elementId);
    }
  }
  return ids;
}

export default function HomePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setError("");
        setItems(await listUserEvidence(user.uid));
      } catch {
        setError("تعذر تحميل بيانات ملفك الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const approved = useMemo(
    () => items.filter((item) => item.status === "approved"),
    [items]
  );

  const attention = useMemo(
    () =>
      items.filter((item) =>
        ["needs_info", "ready_for_review", "analysis_failed"].includes(
          item.status
        )
      ),
    [items]
  );

  const covered = useMemo(() => coveredIds(approved), [approved]);
  const totalElements = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const coverage = totalElements
    ? Math.round((covered.size / totalElements) * 100)
    : 0;

  const recent = approved.slice(0, 2);

  return (
    <AppShell title="أثري" subtitle="ملف الأداء الذكي">
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow light">ملفك المهني الآن</span>
          <h1>كل شاهد في مكانه، وكل عنصر واضح.</h1>
          <p>
            أثري يجمع الأصول، يقرأ الشاهد، ويرتب ملف الأداء بدون تكرار أو
            فوضى.
          </p>
          <div className="hero-actions-row">
            <Link className="button-on-dark" href="/evidence/new">
              <Icon name="plus" size={19} />
              إضافة شاهد
            </Link>
            <Link className="button-ghost-dark" href="/preview">
              <Icon name="eye" size={18} />
              معاينة الملف
            </Link>
          </div>
        </div>

        <div className="coverage-dial" aria-label={`تغطية ${coverage}%`}>
          <div
            className="coverage-ring"
            style={{
              background: `conic-gradient(#ffffff ${coverage * 3.6}deg, rgba(255,255,255,.18) 0deg)`,
            }}
          >
            <div className="coverage-ring-core">
              <strong>{loading ? "…" : `${coverage}%`}</strong>
              <span>تغطية الإطار</span>
            </div>
          </div>
          <small>
            {loading ? "…" : `${covered.size} من ${totalElements} عناصر`}
          </small>
        </div>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <div className="metric-icon"><Icon name="check" size={19} /></div>
          <div>
            <strong>{loading ? "…" : approved.length}</strong>
            <span>شواهد معتمدة</span>
          </div>
        </article>
        <article className="metric-card">
          <div className="metric-icon"><Icon name="grid" size={19} /></div>
          <div>
            <strong>{loading ? "…" : covered.size}</strong>
            <span>عناصر مغطاة</span>
          </div>
        </article>
        <article className="metric-card attention">
          <div className="metric-icon"><Icon name="clock" size={19} /></div>
          <div>
            <strong>{loading ? "…" : attention.length}</strong>
            <span>تحتاج مراجعة</span>
          </div>
        </article>
      </section>

      {error ? <div className="flow-message is-error">{error}</div> : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">اختصارات</span>
            <h2>وصلي لما تحتاجينه بسرعة</h2>
          </div>
        </div>

        <div className="quick-grid">
          <Link href="/evidence/new" className="quick-card primary-quick">
            <span className="quick-icon"><Icon name="upload" size={21} /></span>
            <strong>إضافة شاهد</strong>
            <small>ملف واحد أو عدة ملفات</small>
          </Link>
          <Link href="/preview" className="quick-card">
            <span className="quick-icon"><Icon name="eye" size={21} /></span>
            <strong>معاينة الملف</strong>
            <small>شاهدي ما ستعرضينه</small>
          </Link>
          <Link href="/portfolio" className="quick-card">
            <span className="quick-icon"><Icon name="folder" size={21} /></span>
            <strong>ملف الأداء</strong>
            <small>العناصر والشواهد</small>
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">المتابعة</span>
            <h2>{attention.length ? "يحتاج انتباهك" : "الوضع مستقر"}</h2>
          </div>
          <Link href="/evidence" className="text-link">عرض الشواهد</Link>
        </div>

        {attention.length ? (
          <div className="stack">
            {attention.slice(0, 3).map((item) => (
              <Link
                href={`/evidence/review?id=${encodeURIComponent(item.id)}`}
                className="evidence-card compact"
                key={item.id}
              >
                <div className="evidence-card-head">
                  <span className="status-pill status-needs-info">
                    {item.status === "analysis_failed"
                      ? "تعذر التحليل"
                      : item.status === "needs_info"
                      ? "يحتاج معلومة"
                      : "جاهز للمراجعة"}
                  </span>
                  <Icon name="chevron" size={18} />
                </div>
                <h3>{item.aiAnalysis?.draftTitle || item.originalFileName}</h3>
              </Link>
            ))}
          </div>
        ) : (
          <div className="success-empty">
            <span className="success-check"><Icon name="check" size={22} /></span>
            <div>
              <strong>لا توجد شواهد معلقة</strong>
              <p>كل ما رفعتيه حاليًا إما معتمد أو لا يحتاج إجراء منك.</p>
            </div>
          </div>
        )}
      </section>

      {recent.length ? (
        <section className="page-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">آخر ما اعتمدتِ</span>
              <h2>شواهد حديثة</h2>
            </div>
          </div>
          <div className="stack">
            {recent.map((item) => (
              <article className="recent-card" key={item.id}>
                <span className="recent-dot" />
                <div>
                  <strong>{item.approvedContent?.title || item.originalFileName}</strong>
                  <p>{item.approvedContent?.elementName}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
