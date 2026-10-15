"use client";

import { useEffect, useRef } from "react";
import "./portfolio-preview-dialog.css";

/** Keep the teacher's page mounted, including its scroll position and open sections. */
export function PortfolioPreviewDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="portfolio-preview-dialog"
      aria-labelledby="portfolio-preview-title"
      dir="rtl"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className="portfolio-preview-toolbar">
        <strong id="portfolio-preview-title">معاينة</strong>
        <div className="portfolio-preview-actions">
          <a href="/preview?print=1" target="_blank" rel="noreferrer">طباعة الملف</a>
          <button type="button" onClick={onClose} autoFocus>العودة إلى صفحتي</button>
        </div>
      </header>
      <iframe src="/preview?embedded=1" title="معاينة ملف الأداء" />
    </dialog>
  );
}
