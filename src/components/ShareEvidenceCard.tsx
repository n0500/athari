"use client";

import { useId, useState } from "react";
import { Glyph, filesLabel } from "@/components/athari-ui/Ui";
import { lookFor } from "@/components/athari-ui/Art";
import { excellenceIndicatorsFor } from "@/lib/excellenceIndicators";
import { attachmentKind, attachmentTitle } from "@/lib/attachmentDisplay";
import "./share-evidence-card.css";

/** Indicators shown before «عرض جميع المؤشرات». */
const PREVIEW_COUNT = 2;
/** A preview line longer than this may be cut to two lines, so the full list stays reachable. */
const LONG_LINE = 90;

export type ShareEvidenceCardItem = {
  id: string;
  title: string;
  description: string;
  impact: string;
  highlight?: string;
  elementId?: string;
  elementName?: string;
  attachments: Array<{ originalFileName?: string; mimeType?: string; driveFileId?: string }>;
};

/**
 * One approved evidence in the principal's view, in reading order:
 * title → evaluation element → short description → impact → excellence
 * indicators → attachments. Only approved wording is shown, never reworded.
 */
export function ShareEvidenceCard({
  item,
  onOpenReport,
  onOpenAttachment,
  ownerName = "",
}: {
  item: ShareEvidenceCardItem;
  onOpenReport: () => void;
  onOpenAttachment?: (index: number) => void;
  /** Used only to drop the owner's name from attachment names. */
  ownerName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const moreId = useId();
  const filesId = useId();
  const indicators = excellenceIndicatorsFor(item);
  const preview = indicators.slice(0, PREVIEW_COUNT);
  const rest = indicators.slice(PREVIEW_COUNT);
  const canExpand = rest.length > 0 || preview.some((line) => line.length > LONG_LINE);
  const tone = lookFor(item.elementId).tone;
  const files = item.attachments.length;

  return (
    <article className="sec-card">
      <h3 className="sec-title">{item.title}</h3>
      {item.elementName ? <span className={`ath-tag tone-${tone} sec-element`}>{item.elementName}</span> : null}
      {item.description ? <p className="sec-desc">{item.description}</p> : null}

      {item.impact ? (
        <div className="sec-impact">
          <span className="sec-label"><Glyph name="chart" size={16} />الأثر</span>
          <p>{item.impact}</p>
        </div>
      ) : null}

      {indicators.length ? (
        <section className={`sec-ind ${open ? "is-open" : ""}`} aria-label="مؤشرات التميز">
          <h4 className="sec-label"><Glyph name="star" size={16} />مؤشرات التميز · {indicators.length}</h4>
          <ul>
            {preview.map((line, index) => <li key={index}>{line}</li>)}
          </ul>
          {rest.length ? (
            <ul id={moreId} className="sec-ind-more" hidden={!open}>
              {rest.map((line, index) => <li key={index}>{line}</li>)}
            </ul>
          ) : null}
          {canExpand ? (
            <button
              type="button"
              className="sec-ind-toggle no-print"
              aria-expanded={open}
              aria-controls={rest.length ? moreId : undefined}
              onClick={() => setOpen((value) => !value)}
            >
              {open ? "إخفاء المؤشرات ▴" : "عرض جميع المؤشرات ▾"}
            </button>
          ) : null}
        </section>
      ) : null}

      <footer className="sec-files">
        <div className="sec-files-bar">
          {files && onOpenAttachment ? (
            <button
              type="button"
              className="sec-files-toggle no-print"
              aria-expanded={filesOpen}
              aria-controls={filesId}
              onClick={() => setFilesOpen((value) => !value)}
            >
              <Glyph name="docOutline" size={16} />المرفقات · {files} {filesOpen ? "▴" : "▾"}
            </button>
          ) : (
            <span className="sec-count"><Glyph name="docOutline" size={15} />{filesLabel(files)}</span>
          )}
          <button type="button" className="sec-view no-print" onClick={onOpenReport}>
            <Glyph name="eye" size={16} />عرض الشاهد
          </button>
        </div>
        {files && onOpenAttachment ? (
          <ol id={filesId} className="sec-files-list no-print" hidden={!filesOpen}>
            {item.attachments.map((attachment, index) => {
              const name = attachment.originalFileName ?? "";
              const kind = attachmentKind(attachment.mimeType ?? "", name);
              const title = attachmentTitle(name, ownerName, index);
              return (
                <li key={index}>
                  <span className={`sec-kind ${kind.tone}`}>{kind.label}</span>
                  <span className="sec-file-name" title={name}>{title}</span>
                  {attachment.driveFileId ? (
                    <button type="button" onClick={() => onOpenAttachment(index)} aria-label={`عرض ${title}`}>
                      <Glyph name="eye" size={15} />عرض
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ol>
        ) : null}
      </footer>
    </article>
  );
}
