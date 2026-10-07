"use client";

import { useEffect, useState } from "react";
import { Glyph } from "@/components/athari-ui/Ui";
import "./back-to-top.css";

/** A fixed «أعلى الصفحة» button that appears after scrolling down a long page. */
export function BackToTop({ after = 700 }: { after?: number }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const update = () => setShown(window.scrollY > after);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, [after]);

  if (!shown) return null;

  return (
    <button
      type="button"
      className="back-to-top no-print"
      onClick={() => window.scrollTo({ top: 0 })}
      aria-label="العودة إلى أعلى الصفحة"
    >
      <Glyph name="chevLeft" size={18} className="back-to-top-icon" />
      أعلى الصفحة
    </button>
  );
}
