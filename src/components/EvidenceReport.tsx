"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Glyph } from "@/components/athari-ui/Ui";
import { requirementsForElement } from "@/data/mandatory-requirements";

export type ReportEvidence = {
  id: string;
  title: string;
  description: string;
  impact: string;
  highlight?: string;
  classifications: Array<{
    elementId: string;
    elementName: string;
    isPrimary: boolean;
    requirementIds?: string[];
  }>;
  attachments: Array<{ originalFileName: string; mimeType: string; driveFileId?: string }>;
};

export type ReportMeta = {
  ownerName: string;
  ministry?: string;
  school?: string;
  department?: string;
  principalName?: string;
  academicYear?: string;
};

const NO_IMPACT = "لا يوجد أثر موثق متاح حاليًا.";

function attachmentKind(mimeType: string, name: string) {
  const lower = name.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return { label: "PDF", tone: "pdf" };
  if (mimeType.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(lower)) return { label: "صورة", tone: "img" };
  if (mimeType.startsWith("video/")) return { label: "فيديو", tone: "doc" };
  if (lower.endsWith(".docx") || mimeType.includes("word")) return { label: "Word", tone: "doc" };
  return { label: "ملف", tone: "other" };
}

function thumbnailUrl(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000`;
}

/**
 * A readable report for one approved evidence, built only from approved content.
 * «طباعة / حفظ PDF» prints the report alone on A4 using the browser print dialog.
 */
export function EvidenceReport({
  item,
  meta,
  onClose,
  onOpenAttachment,
  allowDownload = false,
  position,
  onPrev,
  onNext,
}: {
  item: ReportEvidence;
  meta: ReportMeta;
  onClose: () => void;
  onOpenAttachment?: (index: number) => void;
  /** Only the owner downloads; the shared view is for reading on screen. */
  allowDownload?: boolean;
  /** e.g. { index: 2, total: 7 } to show «3 من 7» with previous/next. */
  position?: { index: number; total: number };
  onPrev?: () => void;
  onNext?: () => void;
}) {
  // Rendered at the end of <body> so printing can hide the page and keep the report.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      // RTL: the right arrow goes back, the left arrow goes forward.
      if (event.key === "ArrowRight" && onPrev) onPrev();
      if (event.key === "ArrowLeft" && onNext) onNext();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

  // Start each evidence at the top of the document.
  useEffect(() => {
    document.querySelector(".ev-report-backdrop")?.scrollTo({ top: 0 });
  }, [item.id]);

  const ordered = [...item.classifications].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  const documented = ordered.flatMap((classification) => {
    const ids = new Set(classification.requirementIds ?? []);
    return requirementsForElement(classification.elementId)
      .filter((requirement) => ids.has(requirement.id))
      .map((requirement) => ({ ...requirement, elementName: classification.elementName }));
  });
  const impact = item.impact && item.impact !== NO_IMPACT ? item.impact : "";
  const images = item.attachments
    .map((attachment, index) => ({ attachment, index }))
    .filter(({ attachment }) => attachment.driveFileId && attachmentKind(attachment.mimeType, attachment.originalFileName).tone === "img")
    .slice(0, 6);
  const printedOn = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  function downloadPdf() {
    const previousTitle = document.title;
    document.title = `تقرير شاهد - ${item.title}`;
    document.body.classList.add("print-evidence-report");
    const restore = () => {
      document.body.classList.remove("print-evidence-report");
      document.title = previousTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
    // Some mobile browsers do not fire afterprint.
    window.setTimeout(restore, 60_000);
  }

  if (!mounted) return null;

  return createPortal(
    <div className="ev-report-backdrop" onClick={onClose}>
      <article
        className="ev-report"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ev-report-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="ev-report-top">
          <button type="button" className="ev-report-close" onClick={onClose} aria-label="إغلاق التقرير">×</button>
          {position && position.total > 1 ? (
            <div className="ev-report-nav">
              <button type="button" onClick={onPrev} disabled={!onPrev} aria-label="الشاهد السابق">
                <Glyph name="chevRight" size={16} />
              </button>
              <span>{position.index + 1} من {position.total}</span>
              <button type="button" onClick={onNext} disabled={!onNext} aria-label="الشاهد التالي">
                <Glyph name="chevLeft" size={16} />
              </button>
            </div>
          ) : <span className="ev-report-label">تقرير الشاهد</span>}
          {allowDownload ? (
            <button type="button" className="ev-report-pdf" onClick={downloadPdf}>
              <Glyph name="download" size={17} />طباعة / حفظ PDF
            </button>
          ) : <span className="ev-report-spacer" />}
        </header>

        {/* Official letterhead: shown on screen and in print */}
        <div className="ev-letterhead">
          <div className="ev-letterhead-org">
            <strong>وزارة التعليم</strong>
            {meta.department ? <span>{meta.department}</span> : null}
            {meta.school ? <span>{meta.school}</span> : null}
          </div>
          <div className="ev-letterhead-doc">
            <strong>تقرير شاهد</strong>
            <span>ملف الأداء المهني</span>
            {meta.academicYear ? <span>العام الدراسي {meta.academicYear}</span> : null}
          </div>
        </div>

        <div className="ev-report-body">
          <div className="ev-report-tags">
            {ordered.map((classification) => (
              <span key={classification.elementId} className={classification.isPrimary ? "primary" : ""}>
                {classification.isPrimary ? "العنصر الأساسي: " : ""}{classification.elementName}
              </span>
            ))}
          </div>

          <h2 id="ev-report-title">{item.title}</h2>

          {item.description ? (
            <section className="ev-report-sec">
              <h3>وصف التنفيذ</h3>
              <p>{item.description}</p>
            </section>
          ) : null}

          {impact ? (
            <section className="ev-report-sec">
              <h3>الأثر</h3>
              <p>{impact}</p>
            </section>
          ) : null}

          {documented.length ? (
            <section className="ev-report-sec">
              <h3>بنود المتابعة الموثقة</h3>
              <ul className="ev-report-reqs">
                {documented.map((requirement) => (
                  <li key={`${requirement.elementName}-${requirement.id}`}>
                    <Glyph name="check" size={16} />
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {images.length ? (
            <section className="ev-report-sec ev-report-gallery">
              <h3>صور من الشاهد</h3>
              <div>
                {images.map(({ attachment, index }) => (
                  <figure
                    key={`${attachment.driveFileId}-${index}`}
                    onClick={onOpenAttachment ? () => onOpenAttachment(index) : undefined}
                    className={onOpenAttachment ? "is-clickable" : ""}
                  >
                    <img
                      src={thumbnailUrl(attachment.driveFileId!)}
                      alt={attachment.originalFileName}
                      loading="eager"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        const figure = event.currentTarget.closest("figure");
                        if (figure) figure.hidden = true;
                      }}
                    />
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {item.attachments.length ? (
            <section className="ev-report-sec">
              <h3>المرفقات ({item.attachments.length})</h3>
              <div className="ev-report-files">
                {item.attachments.map((attachment, index) => {
                  const kind = attachmentKind(attachment.mimeType, attachment.originalFileName);
                  return (
                    <div className="ev-report-file" key={`${attachment.originalFileName}-${index}`}>
                      <span className={`add-kind ${kind.tone}`}>{kind.label}</span>
                      <strong>{attachment.originalFileName}</strong>
                      {attachment.driveFileId && onOpenAttachment ? (
                        <button type="button" onClick={() => onOpenAttachment(index)}>
                          <Glyph name="eye" size={16} />عرض
                        </button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="ev-signatures">
          <div>
            <span>المعلمة</span>
            <strong>{meta.ownerName || "—"}</strong>
            <i aria-hidden />
            <small>التوقيع</small>
          </div>
          <div>
            <span>مديرة المدرسة</span>
            <strong>{meta.principalName || "—"}</strong>
            <i aria-hidden />
            <small>التوقيع</small>
          </div>
        </footer>
        <p className="ev-issued">أُعدّ عبر أثري بتاريخ {printedOn}</p>
      </article>
    </div>,
    document.body
  );
}
