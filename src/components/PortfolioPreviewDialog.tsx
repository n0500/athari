"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PrincipalPortfolioPreview } from "@/components/PrincipalPortfolioPreview";
import "./portfolio-preview-dialog.css";

/** Keep preview, report controls and printing in one browser document. */
export function PortfolioPreviewDialog({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const background = document.querySelector<HTMLElement>("body > .ath");
    const wasInert = background?.inert ?? false;
    if (background) background.inert = true;
    backRef.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (document.querySelector(".ev-report-backdrop, .share-viewer-backdrop")) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (background) background.inert = wasInert;
      previousFocus?.focus({ preventScroll: true });
    };
  }, [mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <section
      className="portfolio-preview-overlay no-print"
      role="dialog"
      aria-modal="true"
      aria-labelledby="portfolio-preview-title"
      dir="rtl"
    >
      <header className="portfolio-preview-toolbar">
        <strong id="portfolio-preview-title">معاينة</strong>
        <div className="portfolio-preview-actions">
          <button ref={backRef} type="button" onClick={onClose}>العودة إلى صفحتي</button>
        </div>
      </header>
      <div className="portfolio-preview-content" id="portfolio-preview-content">
        <PrincipalPortfolioPreview />
      </div>
    </section>,
    document.body
  );
}
