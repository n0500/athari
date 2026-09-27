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

const ELEMENT_ART: Record<string, string> = {
  "teacher-duty-performance": "/athari-assets/element-duty.webp",
  "professional-community-engagement": "/athari-assets/element-community.webp",
  "parent-engagement": "/athari-assets/element-parent.webp",
  "teaching-strategies-variety": "/athari-assets/element-strategies.webp",
  "learner-results-improvement": "/athari-assets/element-improve.webp",
  "learning-plan": "/athari-assets/element-plan.webp",
  "learning-technology": "/athari-assets/element-tech.webp",
  "learning-environment": "/athari-assets/element-environment.webp",
  "classroom-management": "/athari-assets/element-classroom.webp",
  "learner-results-analysis": "/athari-assets/element-analysis.webp",
  "assessment-methods-variety": "/athari-assets/element-assessment.webp",
};

function itemCoversElement(item: EvidenceRecord, elementId: string) {
  const approved = item.approvedContent;
  if (!approved) return false;
  if (approved.classifications?.length) return approved.classifications.some((entry) => entry.elementId === elementId);
  return approved.elementId === elementId;
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [{
    originalFileName: item.originalFileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
    ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
  }];
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
        setItems(all.filter((item) => item.status === "approved" && itemCoversElement(item, elementId)));
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
        <div className="v4-empty-panel"><Icon name="alert" size={28} /><strong>تعذر تحديد عنصر التقييم</strong><Link href="/portfolio">العودة إلى ملفي</Link></div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="exact-breadcrumb">
        <Link href="/portfolio">ملفي</Link><Icon name="chevron" size={13} /><span>عناصر التقييم</span><Icon name="chevron" size={13} /><strong>{element.officialName}</strong>
      </div>

      <section className={`exact-element-hero tone-${guidance.tone}`}>
        <img src={ELEMENT_ART[element.id] ?? "/athari-analytics-premium.svg"} alt="" />
        <div className="exact-element-hero-copy">
          <span className="exact-element-kind"><Icon name={guidance.icon} size={16} /> عنصر التقييم</span>
          <h1>{element.officialName}</h1>
          <div className="exact-element-meta">
            {element.weightPercent ? <span>{element.weightPercent}% من وزن التقييم</span> : null}
            <span><Icon name="check" size={14} /> {loading ? "…" : `${items.length} شواهد معتمدة`}</span>
            <span><Icon name="file" size={14} /> {loading ? "…" : `${filesCount} ملفات`}</span>
          </div>
        </div>
      </section>

      <section className="exact-info-card exact-explanation">
        <div className="exact-info-title"><span><Icon name="file" size={21} /></span><div><small>من الدليل الرسمي</small><h2>تفسير العنصر</h2></div></div>
        <p>{element.description}</p>
        <small className="exact-source">{OFFICIAL_TEACHER_FRAMEWORK_META.sourceTitle} · {OFFICIAL_TEACHER_FRAMEWORK_META.edition} · ص {guidance.sourcePage}</small>
      </section>

      <section className="exact-info-card">
        <div className="exact-info-title"><span className="idea"><Icon name="idea" size={21} /></span><div><small>ممارسات واردة في تفسير العنصر</small><h2>ما الذي يدعم هذا العنصر؟</h2></div></div>
        <div className="exact-support-grid">
          {guidance.supports.map((support, index) => (
            <article className={`support-${index + 1}`} key={support}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{support}</strong>
            </article>
          ))}
        </div>
      </section>

      <section className="exact-info-card">
        <div className="exact-info-title"><span><Icon name="folder" size={21} /></span><div><small>{loading ? "جاري التحميل…" : `${items.length} شواهد تغطي هذا العنصر`}</small><h2>شواهدي المعتمدة</h2></div></div>
        {error ? <div className="flow-message is-error">{error}</div> : null}

        <div className="exact-detail-list">
          {items.map((item, index) => {
            const attachments = attachmentsFor(item);
            return (
              <article className="exact-detail-evidence" key={item.id}>
                <div className={`exact-detail-thumb thumb-${(index % 3) + 1}`} />
                <div className="exact-detail-copy">
                  <div><strong>{item.approvedContent?.title || item.originalFileName}</strong><span><Icon name="check" size={13} /> معتمد</span></div>
                  {item.approvedContent?.description ? <p>{item.approvedContent.description}</p> : null}
                  <footer>
                    <span><Icon name="file" size={14} /> {attachments.length} {attachments.length === 1 ? "ملف" : "ملفات"}</span>
                    <div>
                      <Link href={`/evidence/review?id=${encodeURIComponent(item.id)}`}><Icon name="eye" size={15} /> عرض</Link>
                      {attachments[0]?.driveWebViewLink ? <a href={attachments[0].driveWebViewLink} target="_blank" rel="noreferrer"><Icon name="paperclip" size={15} /> المرفقات</a> : null}
                    </div>
                  </footer>
                </div>
              </article>
            );
          })}
          {!loading && !error && !items.length ? <div className="exact-empty">لا يوجد شاهد معتمد لهذا العنصر حتى الآن.</div> : null}
        </div>
      </section>

      <Link className="exact-add-evidence" href="/evidence/new"><Icon name="plus" size={21} /><span><strong>إضافة شاهد جديد</strong><small>يمكن ربط أكثر من ملف للشاهد الواحد</small></span></Link>
    </AppShell>
  );
}

export default function ElementPage() {
  return <Suspense fallback={<div className="setup-notice">جاري تحميل عنصر التقييم…</div>}><ElementPageInner /></Suspense>;
}
