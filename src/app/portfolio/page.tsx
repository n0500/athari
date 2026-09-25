"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { EvidenceRecord } from "@/types/athari";

export default function PortfolioPage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;

    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        const all = await listUserEvidence(user.uid);
        setItems(all.filter((item) => item.status === "approved"));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, EvidenceRecord[]>();
    for (const item of items) {
      const key = item.approvedContent?.elementName || "غير مصنف";
      map.set(key, [...(map.get(key) || []), item]);
    }
    return [...map.entries()];
  }, [items]);

  const year =
    process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  return (
    <AppShell title="ملفي" subtitle="الشواهد مرتبة حسب عناصر الأداء">
      <section className="portfolio-summary">
        <span className="eyebrow">{year}</span>
        <h1>ملف الأداء المهني</h1>
        <p>
          {loading
            ? "جاري التحميل…"
            : `${items.length} شاهد معتمد — والأصول محفوظة في Google Drive.`}
        </p>
      </section>

      {!firebaseConfigured ? (
        <div className="setup-notice">
          الواجهة جاهزة. بعد ربط Firebase ستظهر الشواهد الحقيقية مرتبة هنا.
        </div>
      ) : null}

      <div className="stack">
        {grouped.map(([element, evidence], index) => (
          <section className="portfolio-group" key={element}>
            <div className="element-card">
              <div className="element-number">{index + 1}</div>
              <div className="element-copy">
                <strong>{element}</strong>
                <span>{evidence.length} شواهد</span>
              </div>
              <Icon name="folder" size={20} />
            </div>

            <div className="portfolio-evidence-list">
              {evidence.map((item) => (
                <article className="portfolio-evidence" key={item.id}>
                  <strong>{item.approvedContent?.title}</strong>
                  <span>{item.originalFileName}</span>
                  {item.driveWebViewLink ? (
                    <a
                      href={item.driveWebViewLink}
                      target="_blank"
                      rel="noreferrer"
                    >
                      فتح الأصل في Drive
                    </a>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}

        {!loading && firebaseConfigured && grouped.length === 0 ? (
          <div className="setup-notice">
            لا توجد شواهد معتمدة بعد.
          </div>
        ) : null}
      </div>

      <section className="coverage-note">
        <Icon name="sparkle" size={20} />
        <div>
          <strong>الترتيب في أثري والحفظ في Drive</strong>
          <p>
            Firestore يحتفظ بالفهرس، وGoogle Drive يحتفظ بالأصل والنسخة
            الاحتياطية.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
