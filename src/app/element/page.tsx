"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { OFFICIAL_TEACHER_FRAMEWORK_META, OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import type { EvidenceAttachment, EvidenceRecord } from "@/types/athari";

function itemCoversElement(item: EvidenceRecord, elementId: string) {
  const approved = item.approvedContent;
  if (!approved) return false;
  if (approved.classifications?.length) {
    return approved.classifications.some((entry) => entry.elementId === elementId);
  }
  return approved.elementId === elementId;
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
    },
  ];
}

function ElementPageInner() {
  const params = useSearchParams();
  const elementId = params.get("id") ?? "";
  const element = OFFICIAL_TEACHER_FRAMEWORK_V2.find((entry) => entry.id === elementId);
  const guidance = element ? ELEMENT_GUIDANCE[element.id] : undefined;
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setError("");
        const all = await listUserEvidence(user.uid);
        setItems(
          all.filter(
            (item) => item.status === "approved" && itemCoversElement(item, elementId)
          )
        );
      } catch {
        setError("تعذر تحميل شواهد هذا العنصر الآن.");
      } finally {
        setLoading(false);
      }
    });
  }, [elementId]);

  const filesCount = useMemo(
    () => items.reduce((sum, item) => sum + attachmentsFor(item).length, 0),
    [items]
  );

  if (!element || !guidance) {
    return (
      <AppShell title="عنصر التقييم" subtitle="الدليل الرسمي">
        <div className="v4-empty-panel">
          <Icon name="alert" size={28} />
          <strong>تعذر تحديد عنصر التقييم</strong>
          <Link href="/portfolio">العودة إلى ملفي</Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="عنصر التقييم" subtitle={element.officialName}>
      <div className="v4-breadcrumb">
        <Link href="/portfolio">ملفي</Link>
        <Icon name="chevron" size={14} />
        <span>عناصر التقييم</span>
        <Icon name="chevron" size={14} />
        <strong>{element.officialName}</strong>
      </div>

      <section className={`v4-element-hero tone-${guidance.tone}`}>
        <div className="v4-element-hero-visual" aria-hidden>
          <span className="visual-sheet sheet-one" />
          <span className="visual-sheet sheet-two" />
          <span className="visual-bars"><i/><i/><i/></span>
          <span className="visual-lens" />
          <span className="visual-leaf leaf-one" />
          <span className="visual-leaf leaf-two" />
        </div>

        <div className="v4-element-hero-copy">
          <span className="v4-element-kind">
            <Icon name={guidance.icon} size={17} /> عنصر التقييم
          </span>
          <h2>{element.officialName}</h2>
          <div className="v4-element-chips">
            <span><Icon name="check" size={15} /> {loading ? "…" : `${items.length} شواهد معتمدة`}</span>
            <span><Icon name="file" size={15} /> {loading ? "…" : `${filesCount} ملفات أصلية`}</span>
            {element.weightPercent ? <span>{element.weightPercent}% من وزن التقييم</span> : null}
          </div>
        </div>
      </section>

      <section className="v4-official-card">
        <div className="v4-card-title-row">
          <span className="v4-title-icon"><Icon name="file" size={20} /></span>
          <div>
            <span>من الدليل الرسمي</span>
            <h2>تفسير العنصر</h2>
          </div>
        </div>
        <p>{element.description}</p>
        <small>
          {OFFICIAL_TEACHER_FRAMEWORK_META.sourceTitle} · {OFFICIAL_TEACHER_FRAMEWORK_META.edition} · ص {guidance.sourcePage}
        </small>
      </section>

      <section className="v4-support-card">
        <div className="v4-card-title-row">
          <span className="v4-title-icon lightbulb"><Icon name="idea" size={21} /></span>
          <div>
            <span>ممارسات واردة في تفسير العنصر</span>
            <h2>ما الذي يدعم هذا العنصر؟</h2>
          </div>
        </div>

        <div className="v4-support-grid">
          {guidance.supports.map((support, index) => (
            <article className={`v4-support-item tone-${["blue", "violet", "mint"][index]}`} key={support}>
              <span className="v4-support-number">0{index + 1}</span>
              <strong>{support}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="v4-element-evidence-section">
        <div className="v4-card-title-row">
          <span className="v4-title-icon"><Icon name="folder" size={21} /></span>
          <div>
            <span>{loading ? "جاري التحميل…" : `${items.length} شواهد تغطي هذا العنصر`}</span>
            <h2>شواهدي المعتمدة</h2>
          </div>
        </div>

        {error ? <div className="flow-message is-error">{error}</div> : null}

        <div className="v4-element-evidence-list">
          {items.map((item) => {
            const attachments = attachmentsFor(item);
            const title = item.approvedContent?.title || item.originalFileName;
            const description = item.approvedContent?.description || "";
            const impact = item.approvedContent?.impact || "";

            return (
              <article className="v4-detail-evidence" key={item.id}>
                <div className="v4-detail-evidence-icon">
                  <Icon name={guidance.icon} size={26} />
                </div>
                <div className="v4-detail-evidence-copy">
                  <div className="v4-detail-evidence-head">
                    <strong>{title}</strong>
                    <span><Icon name="check" size={13} /> معتمد</span>
                  </div>
                  {description ? <p>{description}</p> : null}
                  {impact && impact !== "لا يوجد أثر موثق متاح حاليًا." ? (
                    <div className="v4-impact-note">
                      <Icon name="sparkle" size={14} />
                      <span>{impact}</span>
                    </div>
                  ) : null}
                  <div className="v4-detail-evidence-footer">
                    <span><Icon name="file" size={14} /> {attachments.length} {attachments.length === 1 ? "ملف" : "ملفات"}</span>
                    <div>
                      <Link className="v4-view-button" href={`/evidence/review?id=${encodeURIComponent(item.id)}`}>
                        <Icon name="eye" size={15} /> عرض
                      </Link>
                      {attachments[0]?.driveWebViewLink ? (
                        <a className="v4-attachment-button" href={attachments[0].driveWebViewLink} target="_blank" rel="noreferrer">
                          <Icon name="paperclip" size={15} /> فتح المرفقات
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!loading && !error && items.length === 0 ? (
            <div className="v4-element-empty">
              <span><Icon name={guidance.icon} size={28} /></span>
              <strong>لا يوجد شاهد معتمد لهذا العنصر حتى الآن</strong>
              <p>ارفعي شاهدًا جديدًا، وسيقترح أثري تصنيفه وفق محتواه الفعلي.</p>
            </div>
          ) : null}
        </div>
      </section>

      <Link className="v4-add-evidence-cta" href="/evidence/new">
        <span><Icon name="plus" size={23} /></span>
        <div>
          <strong>إضافة شاهد جديد</strong>
          <small>يمكن ربط أكثر من ملف للشاهد الواحد</small>
        </div>
      </Link>
    </AppShell>
  );
}

export default function ElementPage() {
  return (
    <Suspense fallback={<div className="setup-notice">جاري تحميل عنصر التقييم…</div>}>
      <ElementPageInner />
    </Suspense>
  );
}
