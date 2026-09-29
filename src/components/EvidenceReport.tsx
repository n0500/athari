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
  specialization?: string;
  rank?: string;
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

/**
 * A readable attachment name: no extension, no repeated owner name.
 * "نهى … المطيري - دورة كذا.pdf" → "دورة كذا"; a name that is only the owner's → "مرفق 3".
 */
function attachmentTitle(name: string, ownerName: string, index: number) {
  const ownerWords = new Set(ownerName.split(/\s+/).filter((word) => word.length > 1));
  const isOwnerOnly = (part: string) => {
    const words = part.replace(/[\d().\-_]+/g, " ").split(/\s+/).filter(Boolean);
    const shared = words.filter((word) => ownerWords.has(word)).length;
    return !words.length || (shared >= 2 && shared >= words.length - 1);
  };
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "").trim();
  const kept = base.split(" - ").map((part) => part.trim()).filter((part) => part && !isOwnerOnly(part));
  return kept.length ? kept.join(" - ") : `مرفق ${index + 1}`;
}

function attachmentCount(count: number) {
  if (count === 1) return "ملف واحد";
  if (count === 2) return "ملفان";
  if (count <= 10) return `${count} ملفات`;
  return `${count} ملفًا`;
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
  const primary = ordered[0];
  const secondary = ordered.slice(1);
  const roleLine = [meta.specialization, meta.rank].filter(Boolean).join(" · ");
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

        <div className="rp-paper">
          {/* Official letterhead: shown on screen and in print */}
          <div className="rp-lh">
            <div className="rp-lh-org">
              <strong>المملكة العربية السعودية</strong>
              <span>{meta.ministry || "وزارة التعليم"}</span>
              {meta.department ? <span>{meta.department}</span> : null}
              {meta.school ? <span>{meta.school}</span> : null}
            </div>
            <div className="rp-lh-doc">
              <strong>تقرير شاهد</strong>
              {meta.academicYear ? <span>العام الدراسي {meta.academicYear}</span> : null}
              <span>التاريخ: {printedOn}</span>
            </div>
          </div>
          <div className="rp-rule" aria-hidden />

          <div className="rp-title">
            {primary ? <small>{primary.elementName}</small> : null}
            <h2 id="ev-report-title">{item.title}</h2>
          </div>

          <table className="rp-info">
            <tbody>
              <tr><th scope="row">اسم المعلمة</th><td>{meta.ownerName || "—"}</td></tr>
              {roleLine ? <tr><th scope="row">التخصص / الرتبة</th><td>{roleLine}</td></tr> : null}
              <tr><th scope="row">عنصر التقييم</th><td>{primary?.elementName || "—"}</td></tr>
              {secondary.length ? (
                <tr><th scope="row">عناصر داعمة</th><td>{secondary.map((entry) => entry.elementName).join("، ")}</td></tr>
              ) : null}
              <tr><th scope="row">عدد المرفقات</th><td>{attachmentCount(item.attachments.length)}</td></tr>
            </tbody>
          </table>

          {item.description ? (
            <section className="rp-sec">
              <h3>وصف التنفيذ</h3>
              <p>{item.description}</p>
            </section>
          ) : null}

          {impact ? (
            <section className="rp-sec">
              <h3>الأثر</h3>
              <div className="rp-box"><p>{impact}</p></div>
            </section>
          ) : null}

          {documented.length ? (
            <section className="rp-sec">
              <h3>بنود المتابعة الموثقة</h3>
              <ul className="rp-reqs">
                {documented.map((requirement) => (
                  <li key={`${requirement.elementName}-${requirement.id}`}>
                    <i aria-hidden>✓</i>
                    <span>{requirement.label}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {images.length ? (
            <section className="rp-sec rp-gallery">
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
                      alt={attachmentTitle(attachment.originalFileName, meta.ownerName, index)}
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
            <section className="rp-sec">
              <h3>المرفقات</h3>
              <ol className="rp-files">
                {item.attachments.map((attachment, index) => {
                  const kind = attachmentKind(attachment.mimeType, attachment.originalFileName);
                  const canOpen = Boolean(attachment.driveFileId && onOpenAttachment);
                  return (
                    <li key={`${attachment.originalFileName}-${index}`}>
                      <span className="rp-num" aria-hidden>{index + 1}</span>
                      <span className="rp-name" title={attachment.originalFileName}>
                        {attachmentTitle(attachment.originalFileName, meta.ownerName, index)}
                      </span>
                      <span className={`rp-kind ${kind.tone}`}>{kind.label}</span>
                      {canOpen ? (
                        <button type="button" className="rp-open" onClick={() => onOpenAttachment!(index)} aria-label={`عرض المرفق ${index + 1}`}>
                          <Glyph name="eye" size={16} />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </section>
          ) : null}

          <table className="rp-sign">
            <thead>
              <tr><th scope="col">المعلمة</th><th scope="col">مديرة المدرسة</th></tr>
            </thead>
            <tbody>
              <tr><td><strong>{meta.ownerName || "—"}</strong></td><td><strong>{meta.principalName || "—"}</strong></td></tr>
              <tr><td className="rp-sign-space">التوقيع</td><td className="rp-sign-space">التوقيع والختم</td></tr>
            </tbody>
          </table>

          <footer className="rp-foot">
            <span>أُعدّ عبر أثري</span>
            <span>{printedOn}</span>
          </footer>
        </div>
      </article>
    </div>,
    document.body
  );
}
