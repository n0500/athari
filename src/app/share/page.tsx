"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/Icon";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
import type {
  PortfolioShare,
  ShareAttachment,
  ShareEvidence,
} from "@/lib/portfolioShare";

type ViewerAttachment = ShareAttachment & { title: string };

type GroupedElement = {
  element: (typeof OFFICIAL_TEACHER_FRAMEWORK_V2)[number];
  evidence: ShareEvidence[];
};

function viewerUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function uniqueEvidenceById(items: ShareEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function attachmentCount(item: ShareEvidence) {
  return item.attachments?.length ?? 0;
}

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<ViewerAttachment | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

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

  const grouped = useMemo<GroupedElement[]>(() => {
    if (!share) return [];

    const map = new Map<string, ShareEvidence[]>();
    for (const item of share.evidence) {
      for (const classification of item.classifications) {
        const current = map.get(classification.elementId) ?? [];
        if (!current.some((entry) => entry.id === item.id)) {
          map.set(classification.elementId, [...current, item]);
        }
      }
    }

    return OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => ({
      element,
      evidence: map.get(element.id) ?? [],
    }));
  }, [share]);

  const covered = grouped.filter((group) => group.evidence.length > 0).length;
  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const coverage = total ? Math.round((covered / total) * 100) : 0;
  const allEvidence = useMemo(
    () => uniqueEvidenceById(grouped.flatMap((group) => group.evidence)),
    [grouped]
  );

  const activeGroup = activeElementId
    ? grouped.find((group) => group.element.id === activeElementId) ?? null
    : null;

  function openFirstAttachment(item: ShareEvidence) {
    const attachment = item.attachments.find((entry) => entry.driveFileId);
    if (!attachment) return;
    setViewer({ ...attachment, title: item.title });
  }

  function openSpecificAttachment(item: ShareEvidence, attachmentIndex: number) {
    const attachment = item.attachments[attachmentIndex];
    if (!attachment?.driveFileId) return;
    setViewer({
      ...attachment,
      title:
        item.attachments.length === 1
          ? item.title
          : `${item.title} · الملف ${attachmentIndex + 1}`,
    });
  }

  if (loading) {
    return (
      <main className="share-v5-shell">
        <div className="share-v5-state-card">
          <span><Icon name="clock" size={28} /></span>
          <strong>جاري فتح ملف الأداء…</strong>
          <p>لحظات ويظهر الملف المعتمد.</p>
        </div>
      </main>
    );
  }

  if (!share || error) {
    return (
      <main className="share-v5-shell">
        <div className="share-v5-state-card">
          <span><Icon name="shield" size={28} /></span>
          <strong>الرابط غير متاح</strong>
          <p>{error || "قد يكون الرابط قد تم إيقافه من صاحبة الملف."}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="share-v5-shell">
      <div className="share-v5-page">
        <header className="share-v5-topbar no-print">
          <div className="share-v5-brand">
            <span className="share-v5-logo-mark"><i/><i/></span>
            <div>
              <strong>أثري</strong>
              <small>{activeGroup ? "نسخة عرض للمديرة" : "ملف الأداء المهني"}</small>
            </div>
          </div>

          <div className="share-v5-top-actions">
            <span className="share-v5-safe-badge"><Icon name="shield" size={16}/> موثق ومحفوظ</span>
            <button type="button" onClick={() => window.print()} className="share-v5-print-btn">
              <Icon name="print" size={17}/>
              طباعة / حفظ PDF
            </button>
          </div>
        </header>

        {activeGroup ? (
          <ElementDetail
            group={activeGroup}
            onBack={() => setActiveElementId(null)}
            onOpenAttachment={openSpecificAttachment}
          />
        ) : (
          <>
            <section className="share-v5-hero">
              <div className="share-v5-hero-art" aria-hidden>
                <span className="share-v5-art-leaf leaf-a" />
                <span className="share-v5-art-leaf leaf-b" />
                <span className="share-v5-art-leaf leaf-c" />
                <span className="share-v5-folder folder-a" />
                <span className="share-v5-folder folder-b" />
                <span className="share-v5-folder folder-c" />
                <span className="share-v5-paper paper-a" />
                <span className="share-v5-chart-sheet"><i/><i/><i/><i/></span>
                <span className="share-v5-pencil" />
                <span className="share-v5-star">✦</span>
              </div>

              <div className="share-v5-hero-copy">
                <span className="share-v5-year"><Icon name="calendar" size={16}/> العام الدراسي {share.academicYear}</span>
                <span className="share-v5-kicker">ملف الأداء المهني</span>
                <h1>{share.ownerDisplayName}</h1>
                <p>{share.evidence.length} شواهد معتمدة · {covered} من {total} عنصر تقييم</p>
                <div className="share-v5-hero-buttons no-print">
                  <a href="#approved-evidence" className="share-v5-primary-btn"><Icon name="eye" size={18}/> استعراض الشواهد</a>
                  <button type="button" onClick={() => window.print()} className="share-v5-secondary-btn"><Icon name="print" size={18}/> طباعة / حفظ PDF</button>
                </div>
              </div>

              <div className="share-v5-ring" style={{ background: `conic-gradient(#6ce6d1 ${coverage * 3.6}deg, rgba(255,255,255,.18) 0deg)` }}>
                <div>
                  <strong>{coverage}%</strong>
                  <span>تغطية الإطار</span>
                </div>
              </div>
            </section>

            <section className="share-v5-summary-grid">
              <article className="share-v5-summary-card blue">
                <span><Icon name="shield" size={23}/></span>
                <div><strong>صفحة للعرض فقط</strong><small>لا يمكن التعديل على المحتوى</small></div>
              </article>
              <article className="share-v5-summary-card mint">
                <span><Icon name="file" size={23}/></span>
                <div><strong>{share.evidence.length}</strong><small>شواهد معتمدة</small></div>
              </article>
              <article className="share-v5-summary-card violet">
                <span><Icon name="folder" size={23}/></span>
                <div><strong>{covered} من {total}</strong><small>عنصر تقييم مغطى</small></div>
              </article>
            </section>

            <section className="share-v5-section">
              <div className="share-v5-section-head">
                <div>
                  <span className="share-v5-eyebrow">وفق الدليل الرسمي</span>
                  <h2>عناصر التقييم</h2>
                  <p>يتم استخدام المسميات الرسمية لعناصر التقييم كما في الدليل المعتمد.</p>
                </div>
                <span className="share-v5-count-pill"><Icon name="grid" size={15}/> {total} عنصر تقييم</span>
              </div>

              <div className="share-v5-elements-grid">
                {grouped.map(({ element, evidence }) => {
                  const guidance = ELEMENT_GUIDANCE[element.id];
                  return (
                    <button
                      type="button"
                      className={`share-v5-element-card tone-${guidance?.tone ?? "blue"} ${evidence.length ? "is-covered" : "is-empty"}`}
                      key={element.id}
                      onClick={() => setActiveElementId(element.id)}
                    >
                      <span className="share-v5-element-status">
                        {evidence.length ? <Icon name="check" size={14}/> : null}
                      </span>
                      <span className="share-v5-element-icon"><Icon name={guidance?.icon ?? "grid"} size={29}/></span>
                      <div>
                        <strong>{element.officialName}</strong>
                        <small>{evidence.length ? `${evidence.length} ${evidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}` : "لا يوجد شاهد معتمد"}</small>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="share-v5-section" id="approved-evidence">
              <div className="share-v5-section-head">
                <div>
                  <span className="share-v5-eyebrow">الشواهد الموثقة</span>
                  <h2>الشواهد المعتمدة</h2>
                  <p>{allEvidence.length} شواهد معتمدة تغطي عناصر مختلفة من إطار التقييم.</p>
                </div>
              </div>

              <div className="share-v5-evidence-grid">
                {allEvidence.map((item, index) => {
                  const primary = item.classifications.find((entry) => entry.isPrimary) ?? item.classifications[0];
                  const element = primary ? OFFICIAL_TEACHER_FRAMEWORK_V2.find((entry) => entry.id === primary.elementId) : undefined;
                  const guidance = element ? ELEMENT_GUIDANCE[element.id] : undefined;
                  return (
                    <article className="share-v5-evidence-card" key={item.id}>
                      <div className={`share-v5-evidence-visual tone-${guidance?.tone ?? (index % 2 ? "mint" : "blue")}`}>
                        <span className="share-v5-evidence-icon"><Icon name={guidance?.icon ?? "file"} size={30}/></span>
                        <span className="share-v5-evidence-leaf leaf-one"/>
                        <span className="share-v5-evidence-leaf leaf-two"/>
                      </div>
                      <div className="share-v5-evidence-content">
                        {primary ? <span className="share-v5-evidence-tag">{primary.elementName}</span> : null}
                        <h3>{item.title}</h3>
                        {item.description ? <p>{item.description}</p> : null}
                        <div className="share-v5-evidence-meta">
                          <span><Icon name="file" size={14}/> {attachmentCount(item)} {attachmentCount(item) === 1 ? "ملف" : "ملفات"}</span>
                          {item.classifications.length > 1 ? <span>شاهد مشترك</span> : null}
                        </div>
                        <button type="button" className="share-v5-view-evidence" onClick={() => openFirstAttachment(item)} disabled={!item.attachments.some((entry) => entry.driveFileId)}>
                          <Icon name="eye" size={16}/> عرض الشاهد
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <footer className="share-v5-footer">
              <span>أثري</span>
              <span>نسخة عرض للقراءة فقط · الشواهد المعتمدة فقط</span>
            </footer>
          </>
        )}
      </div>

      {viewer?.driveFileId ? (
        <div className="share-viewer-backdrop no-print" onClick={() => setViewer(null)}>
          <section className="share-viewer" onClick={(event) => event.stopPropagation()}>
            <header className="share-viewer-head">
              <div>
                <span className="eyebrow">معاينة الشاهد</span>
                <strong>{viewer.title}</strong>
              </div>
              <button type="button" onClick={() => setViewer(null)} aria-label="إغلاق">×</button>
            </header>
            <iframe src={viewerUrl(viewer.driveFileId)} title={viewer.title} allow="autoplay" />
          </section>
        </div>
      ) : null}
    </main>
  );
}

function ElementDetail({
  group,
  onBack,
  onOpenAttachment,
}: {
  group: GroupedElement;
  onBack: () => void;
  onOpenAttachment: (item: ShareEvidence, attachmentIndex: number) => void;
}) {
  const { element, evidence } = group;
  const guidance = ELEMENT_GUIDANCE[element.id];
  const fileCount = evidence.reduce((sum, item) => sum + item.attachments.length, 0);

  return (
    <>
      <div className="share-v5-breadcrumb no-print">
        <button type="button" onClick={onBack}><Icon name="back" size={16}/> العودة إلى الملف</button>
        <span>عناصر التقييم</span>
        <span>‹</span>
        <strong>{element.officialName}</strong>
      </div>

      <section className={`share-v5-detail-hero tone-${guidance?.tone ?? "blue"}`}>
        <div className="share-v5-detail-art" aria-hidden>
          <span className="detail-sheet sheet-a"/>
          <span className="detail-sheet sheet-b"/>
          <span className="detail-bars"><i/><i/><i/><i/></span>
          <span className="detail-lens"/>
          <span className="detail-leaf l-a"/>
          <span className="detail-leaf l-b"/>
          <span className="detail-pie"/>
        </div>
        <div className="share-v5-detail-copy">
          <span className="share-v5-detail-kind"><Icon name={guidance?.icon ?? "grid"} size={17}/> عنصر التقييم</span>
          <h1>{element.officialName}</h1>
          <div className="share-v5-detail-chips">
            <span><Icon name="check" size={14}/> {evidence.length} {evidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}</span>
            <span><Icon name="file" size={14}/> {fileCount} {fileCount === 1 ? "ملف" : "ملفات"}</span>
            {element.weightPercent ? <span>{element.weightPercent}% من وزن التقييم</span> : null}
          </div>
        </div>
      </section>

      <section className="share-v5-detail-card">
        <div className="share-v5-detail-title">
          <span><Icon name="file" size={20}/></span>
          <div><small>من الدليل الرسمي</small><h2>تفسير العنصر</h2></div>
        </div>
        <p>{element.description}</p>
      </section>

      <section className="share-v5-detail-card">
        <div className="share-v5-detail-title">
          <span className="idea"><Icon name="idea" size={20}/></span>
          <div><small>ممارسات واردة في تفسير العنصر</small><h2>ما الذي يدعم هذا العنصر؟</h2></div>
        </div>
        <div className="share-v5-support-grid">
          {(guidance?.supports ?? []).map((support, index) => (
            <article className={`share-v5-support-item support-${index + 1}`} key={support}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{support}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="share-v5-detail-card">
        <div className="share-v5-detail-title">
          <span><Icon name="folder" size={20}/></span>
          <div><small>{evidence.length} شواهد تغطي هذا العنصر</small><h2>الشواهد المعتمدة</h2></div>
        </div>

        <div className="share-v5-detail-evidence-list">
          {evidence.map((item) => (
            <article className="share-v5-detail-evidence" key={item.id}>
              <div className={`share-v5-detail-evidence-icon tone-${guidance?.tone ?? "blue"}`}>
                <Icon name={guidance?.icon ?? "file"} size={26}/>
              </div>
              <div className="share-v5-detail-evidence-copy">
                <div className="share-v5-detail-evidence-head">
                  <strong>{item.title}</strong>
                  <span><Icon name="check" size={13}/> معتمد</span>
                </div>
                {item.description ? <p>{item.description}</p> : null}
                {item.impact ? <div className="share-v5-impact"><Icon name="sparkle" size={14}/><span>{item.impact}</span></div> : null}
                <div className="share-v5-detail-evidence-actions no-print">
                  <span><Icon name="file" size={14}/> {item.attachments.length} {item.attachments.length === 1 ? "ملف" : "ملفات"}</span>
                  <div>
                    {item.attachments.map((attachment, index) =>
                      attachment.driveFileId ? (
                        <button type="button" key={`${item.id}-${index}`} onClick={() => onOpenAttachment(item, index)}>
                          <Icon name="eye" size={15}/>{item.attachments.length === 1 ? "عرض" : `عرض الملف ${index + 1}`}
                        </button>
                      ) : null
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}

          {!evidence.length ? (
            <div className="share-v5-detail-empty">
              <Icon name={guidance?.icon ?? "file"} size={28}/>
              <strong>لا يوجد شاهد معتمد لهذا العنصر حتى الآن</strong>
              <p>تظهر هنا الشواهد المعتمدة فقط عند تغطية هذا العنصر.</p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
