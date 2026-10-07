"use client";

import { useEffect } from "react";

/** "current" is the existing look: no theme attribute is set, so nothing changes. */
export type AthariTheme = "current" | "original" | "formal" | "signature" | "editorial" | "executive";

export const ATHARI_DEFAULT_THEME: AthariTheme = "current";
export const ATHARI_THEME_STORAGE_KEY = "athari-theme";
export const ATHARI_THEME_EVENT = "athari-theme-change";

const THEMES: AthariTheme[] = ["current", "original", "formal", "signature", "editorial", "executive"];

export function isAthariTheme(value: string | null | undefined): value is AthariTheme {
  return THEMES.includes(value as AthariTheme);
}

export function applyAthariTheme(theme: AthariTheme) {
  const root = document.documentElement;
  if (theme === "current") delete root.dataset.athariTheme;
  else root.dataset.athariTheme = theme;
}

export function readStoredAthariTheme(): AthariTheme {
  try {
    const stored = window.localStorage.getItem(ATHARI_THEME_STORAGE_KEY);
    return isAthariTheme(stored) ? stored : ATHARI_DEFAULT_THEME;
  } catch {
    return ATHARI_DEFAULT_THEME;
  }
}

/** Applies the theme chosen on this device. Stored in the browser only, never in Firebase. */
export function ThemeRuntime() {
  useEffect(() => {
    const sync = () => applyAthariTheme(readStoredAthariTheme());
    const onEvent = (event: Event) => {
      const next = (event as CustomEvent<string>).detail;
      if (isAthariTheme(next)) applyAthariTheme(next);
      else sync();
    };
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener(ATHARI_THEME_EVENT, onEvent);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(ATHARI_THEME_EVENT, onEvent);
    };
  }, []);
  return null;
}
