"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { EvidenceRecord } from "@/types/athari";

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
    () => items.filter((i) => i.status === "approved"),
    [items]
  );

  const attention = useMemo(
    () =>
      items.filter((i) =>
        ["needs_info", "ready_for_review", "analysis_failed"].includes(
          i.status
        )
      ),
    [items]
  );

  return (
    <AppShell title="أثري" subtitle="ملف الأداء الذكي">
      <section className="hero-card">
        <div>
          <span className="eyebrow">ملفك الحالي</span>
          <h1>شواهدك مرتبة ومحفوظة</h1>
          <p>
            الأصل في Google Drive لديك، وأثري ينظم الفهرس والتحليل
            والاعتماد.
          </p>
        </div>
        <Link className="primary-button hero-button" href="/evidence/new">
          <Icon name="plus" size={20} />
          إضافة شاهد
        </Link>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <strong>{loading ? "…" : approved.length}</strong>
          <span>شواهد معتمدة</span>
        </div>
        <div className="stat-card stat-attention">
          <strong>{loading ? "…" : attention.length}</strong>
          <span>تحتاج انتباهك</span>
        </div>
      </section>

      {error ? <div className="flow-message is-error">{error}</div> : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">متابعة سريعة</span>
            <h2>يحتاج انتباهك</h2>
          </div>
          <Link href="/evidence" className="text-link">
            عرض الكل
          </Link>
        </div>

        <div className="stack">
          {attention.slice(0, 3).map((item) => (
            <Link
              href={`/evidence/review?id=${encodeURIComponent(item.id)}`}
              className="evidence-card"
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
              </div>
              <h3>
                {item.aiAnalysis?.draftTitle || item.originalFileName}
              </h3>
              <div className="file-row">
                <Icon name="file" size={17} />
                <span>{item.originalFileName}</span>
              </div>
            </Link>
          ))}

          {!loading && !error && attention.length === 0 ? (
            <div className="setup-notice">
              لا توجد شواهد معلقة حاليًا.
            </div>
          ) : null}
        </div>
      </section>

      <section className="tip-card">
        <div className="tip-icon"><Icon name="sparkle" /></div>
        <div>
          <strong>Drive يحفظ، وأثري يرتب</strong>
          <p>
            ملفاتك الأصلية في حسابك، وأثري يعرض حالة كل شاهد واعتماده.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
