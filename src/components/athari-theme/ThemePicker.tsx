"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  ATHARI_DEFAULT_THEME,
  ATHARI_THEME_EVENT,
  ATHARI_THEME_STORAGE_KEY,
  applyAthariTheme,
  readStoredAthariTheme,
  type AthariTheme,
} from "./ThemeRuntime";

const THEMES: Array<{ id: AthariTheme; name: string; subtitle: string; colors: [string, string, string] }> = [
  { id: "current", name: "الحالي", subtitle: "المظهر المعتاد لأثري", colors: ["#EEF4FB", "#0F4E59", "#1D5FD6"] },
  { id: "original", name: "الأصلي المطوَّر", subtitle: "بطاقات بيضاء مستديرة وظلال ناعمة وذهبي هادئ", colors: ["#EEF3F9", "#0E5A60", "#F2C14E"] },
  { id: "signature", name: "توقيع أثري", subtitle: "الزمردي والعاجي بخطوط ذهبية دقيقة", colors: ["#F7F3EA", "#0F5C4A", "#C9A44C"] },
  { id: "glass", name: "زجاجي", subtitle: "طبقات شفافة بتمويه خفيف وعمق بصري", colors: ["#E3ECFB", "#3D5AFE", "#7FD3F7"] },
];

/** Appearance choice for this device only; it never changes the portfolio content. */
export function ThemePicker() {
  const [value, setValue] = useState<AthariTheme>(ATHARI_DEFAULT_THEME);

  useEffect(() => setValue(readStoredAthariTheme()), []);

  function choose(theme: AthariTheme) {
    setValue(theme);
    try {
      window.localStorage.setItem(ATHARI_THEME_STORAGE_KEY, theme);
    } catch {
      // Private browsing: the choice still applies for this visit.
    }
    applyAthariTheme(theme);
    window.dispatchEvent(new CustomEvent(ATHARI_THEME_EVENT, { detail: theme }));
  }

  return (
    <section className="theme-studio" aria-labelledby="theme-studio-title">
      <h2 id="theme-studio-title">مظهر أثري</h2>
      <p className="theme-note">يتغير المظهر على هذا الجهاز فقط، ولا يؤثر في محتوى ملفك أو في ما تراه المديرة.</p>
      <div className="theme-grid" role="radiogroup" aria-label="مظهر أثري">
        {THEMES.map((theme) => {
          const selected = value === theme.id;
          return (
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              key={theme.id}
              className={`theme-option ${selected ? "is-selected" : ""}`}
              style={{ "--sw-bg": theme.colors[0], "--sw-main": theme.colors[1], "--sw-accent": theme.colors[2] } as CSSProperties}
              onClick={() => choose(theme.id)}
            >
              <span className="theme-swatch" aria-hidden><i /><b /></span>
              <span className="theme-copy"><strong>{theme.name}</strong><small>{theme.subtitle}</small></span>
              <span className="theme-check" aria-hidden>{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
