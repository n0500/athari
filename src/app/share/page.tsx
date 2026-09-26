"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
import type {
  PortfolioShare,
  ShareAttachment,
  ShareEvidence,
} from "@/lib/portfolioShare";

type ViewerAttachment = ShareAttachment & {
  title: string;
};

function viewerUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<ViewerAttachment | null>(null);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    if (!token) {
      setError("رابط العرض غير مكتمل.");
      setLoading(false);
      return;
    }

    getPublicPortfolioShare(token)
      .then((result) => {
        if (!result) {
          setError("رابط العرض غير متاح أو تم إيقافه.");
          return;
        }
        setShare(result);
      })
      .catch(() => setError("رابط العرض غير متاح أو تم إيقافه."))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    if (!share) return [];

    const map = new Map<string, ShareEvidence[]>();

    for (const item of share.evidence) {
      for (const classification of item.classifications) {
        const existing = map.get(classification.elementId) ?? [];
        if (!existing.some((entry) => entry.id === item.id)) {
          map.set(classification.elementId, [...existing, item]);
        }
      }
    }

    return OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => ({
      element,
      index,
      evidence: map.get(element.id) ?? [],
    }));
  }, [share]);

  const covered = grouped.filter((group) => group.evidence.length > 0).length;
  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;

  if (loading) {
    return (
      <main className="public-share-page">
        <div className="public-share-state">
          <span className="public-share-state-icon"><Icon name="clock" size={26} /></span>
          <strong>جاري فتح ملف الأداء…</strong>
          <p>لحظات ويظهر الملف المعتمد.</p>
        </div>
      </main>
    );
  }

  if (!share || error) {
    return (
      <main className="public-share-page">
        <div className="public-share-state">
          <span className="public-share-state-icon"><Icon name="shield" size={26} /></span>
          <strong>الرابط غير متاح</strong>
          <p>{error || "قد يكون الرابط قد تم إيقافه من صاحبة الملف."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="public-share-page">
      <header className="public-share-topbar no-print">
        <div className="public-share-brand">
          <span>أ</span>
          <div>
            <strong>أثري</strong>
            <small>نسخة عرض للقراءة فقط</small>
          </div>
        </div>
        <button className="public-print-button" onClick={() => window.print()}>
          <Icon name="print" size={17} />
          طباعة / حفظ PDF
        </button>
      </header>

      <article className="public-portfolio-document">
        <header className="public-portfolio-cover">
          <div className="public-cover-copy">
            <span>ملف الأداء المهني</span>
            <h1>{share.ownerDisplayName}</h1>
            <p>العام الدراسي {share.academicYear}</p>
          </div>
          <div className="public-cover-metrics">
            <div>
              <strong>{share.evidence.length}</strong>
              <span>شاهد معتمد</span>
            </div>
            <div>
              <strong>{covered}/{total}</strong>
              <span>عناصر مغطاة</span>
            </div>
          </div>
        </header>

        <section className="public-portfolio-intro">
          <div>
            <span className="eyebrow">نسخة رسمية للعرض</span>
            <h2>الشواهد المعتمدة</h2>
          </div>
          <p>
            تعرض هذه الصفحة الشواهد التي اعتمدتها صاحبة الملف فقط، مرتبة وفق
            عناصر تقييم أداء المعلم. الرابط للقراءة ولا يتيح التعديل أو الوصول
            إلى مجلدات Google Drive الداخلية.
          </p>
        </section>

        <div className="public-elements-list">
          {grouped.map(({ element, index, evidence }) => (
            <section
              className={`public-element ${evidence.length ? "is-covered" : "is-empty"}`}
              key={element.id}
            >
              <div className="public-element-head">
                <span className="public-element-number">{index + 1}</span>
                <div>
                  <h2>{element.officialName}</h2>
                  <p>
                    {element.weightPercent
                      ? `${element.weightPercent}% من وزن التقييم`
                      : "عنصر أداء"}
                  </p>
                </div>
                <span className={`coverage-chip ${evidence.length ? "covered" : "empty"}`}>
                  {evidence.length
                    ? `${evidence.length} ${evidence.length === 1 ? "شاهد" : "شواهد"}`
                    : "غير مغطى"}
                </span>
              </div>

              {evidence.length ? (
                <div className="public-evidence-list">
                  {evidence.map((item) => (
                    <article className="public-evidence" key={`${element.id}-${item.id}`}>
                      <div className="public-evidence-head">
                        <h3>{item.title}</h3>
                        {item.classifications.length > 1 ? (
                          <span className="shared-badge">شاهد مشترك</span>
                        ) : null}
                      </div>

                      {item.description ? <p>{item.description}</p> : null}

                      {item.impact ? (
                        <div className="public-impact">
                          <strong>الأثر المدعوم</strong>
                          <span>{item.impact}</span>
                        </div>
                      ) : null}

                      {item.attachments.length ? (
                        <div className="public-attachments no-print">
                          {item.attachments.map((attachment, attachmentIndex) =>
                            attachment.driveFileId ? (
                              <button
                                key={`${attachment.originalFileName}-${attachmentIndex}`}
                                type="button"
                                onClick={() =>
                                  setViewer({
                                    ...attachment,
                                    title:
                                      item.attachments.length === 1
                                        ? item.title
                                        : `${item.title} · الملف ${attachmentIndex + 1}`,
                                  })
                                }
                              >
                                <Icon name="eye" size={15} />
                                {item.attachments.length === 1
                                  ? "عرض الشاهد"
                                  : `عرض الملف ${attachmentIndex + 1}`}
                              </button>
                            ) : null
                          )}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="public-empty-note">لا توجد شواهد معتمدة لهذا العنصر.</p>
              )}
            </section>
          ))}
        </div>

        <footer className="public-portfolio-footer">
          <span>أثري</span>
          <span>نسخة عرض للقراءة فقط · تم تنظيمها من الشواهد المعتمدة</span>
        </footer>
      </article>

      {viewer?.driveFileId ? (
        <div className="share-viewer-backdrop no-print" onClick={() => setViewer(null)}>
          <section className="share-viewer" onClick={(event) => event.stopPropagation()}>
            <header className="share-viewer-head">
              <div>
                <span className="eyebrow">معاينة الشاهد</span>
                <strong>{viewer.title}</strong>
              </div>
              <button type="button" onClick={() => setViewer(null)} aria-label="إغلاق">
                ×
              </button>
            </header>
            <iframe
              src={viewerUrl(viewer.driveFileId)}
              title={viewer.title}
              allow="autoplay"
            />
          </section>
        </div>
      ) : null}
    </main>
  );
}
