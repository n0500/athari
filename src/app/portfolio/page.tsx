"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import {
  ApprovedClassification,
  EvidenceAttachment,
  EvidenceRecord,
} from "@/types/athari";

type GroupedEvidence = {
  item: EvidenceRecord;
  classification: ApprovedClassification;
};

function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];

  if (approved.classifications?.length) {
    return approved.classifications.slice(0, 3);
  }

  if (approved.elementId && approved.elementName) {
    return [
      {
        elementId: approved.elementId,
        elementName: approved.elementName,
        isPrimary: true,
      },
    ];
  }

  return [];
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink
        ? { driveWebViewLink: item.driveWebViewLink }
        : {}),
    },
  ];
}

export default function PortfolioPage() {
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
        const all = await listUserEvidence(user.uid);
        setItems(all.filter((item) => item.status === "approved"));
      } catch {
        setError("تعذر تحميل ملف الأداء الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedEvidence[]>();

    for (const item of items) {
      const classifications = classificationsFor(item);

      if (!classifications.length) {
        map.set("غير مصنف", [
          ...(map.get("غير مصنف") || []),
          {
            item,
            classification: {
              elementId: "unclassified",
              elementName: "غير مصنف",
              isPrimary: true,
            },
          },
        ]);
        continue;
      }

      for (const classification of classifications) {
        const key = classification.elementName;
        map.set(key, [
          ...(map.get(key) || []),
          { item, classification },
        ]);
      }
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

      {error ? <div className="flow-message is-error">{error}</div> : null}

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
              {evidence.map(({ item, classification }) => {
                const shared = classificationsFor(item).length > 1;
                const attachments = attachmentsFor(item);

                return (
                  <article
                    className="portfolio-evidence"
                    key={`${item.id}-${classification.elementId}`}
                  >
                    <div className="portfolio-evidence-head">
                      <strong>{item.approvedContent?.title}</strong>
                      {shared ? (
                        <span className="shared-badge">
                          {classification.isPrimary
                            ? "شاهد مشترك · أساسي"
                            : "شاهد مشترك"}
                        </span>
                      ) : null}
                    </div>

                    <span>
                      {attachments.length === 1
                        ? attachments[0].originalFileName
                        : `${attachments.length} ملفات أصلية`}
                    </span>

                    {classification.reason ? (
                      <p className="classification-reason">
                        {classification.reason}
                      </p>
                    ) : null}

                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      {attachments.map((attachment, attachmentIndex) =>
                        attachment.driveWebViewLink ? (
                          <a
                            key={`${attachment.originalFileName}-${attachmentIndex}`}
                            href={attachment.driveWebViewLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            فتح {attachments.length === 1 ? "الأصل" : `الملف ${attachmentIndex + 1}`}
                          </a>
                        ) : null
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {!loading && !error && grouped.length === 0 ? (
          <div className="setup-notice">لا توجد شواهد معتمدة بعد.</div>
        ) : null}
      </div>

      <section className="coverage-note">
        <Icon name="sparkle" size={20} />
        <div>
          <strong>شاهد واحد قد يتكون من عدة ملفات ويخدم عدة عناصر</strong>
          <p>
            يحفظ أثري حزمة الملفات مرة واحدة في Google Drive، ثم يفهرس
            الشاهد نفسه تحت كل عناصر الأداء التي اعتمدتها دون نسخ إضافية.
          </p>
        </div>
      </section>
    </AppShell>
  );
}
