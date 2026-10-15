"use client";

import { useEffect, useRef } from "react";
import "./portfolio-preview-dialog.css";

/** Keep the teacher's page mounted, including its scroll position and open sections. */
export function PortfolioPreviewDialog({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    const closeFromPreview = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === iframeRef.current?.contentWindow && event.data?.type === "athari-close-preview") onClose();
    };
    window.addEventListener("message", closeFromPreview);
    return () => {
      window.removeEventListener("message", closeFromPreview);
      dialog.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="portfolio-preview-dialog"
      aria-label="معاينة"
      dir="rtl"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <iframe ref={iframeRef} src="/export-check/?inside=1" title="معاينة ملف الأداء" allow="web-share" />
    </dialog>
  );
}
