/* Static decorative illustrations for the Athari mockup design.
   All markup below is constant, hand-authored SVG (no user input). */

const leaf = (x: number, y: number, s: number, r: number, o = 1) =>
  `<g class="ath-lf"><g transform="translate(${x} ${y}) rotate(${r} ${10 * s} ${40 * s}) scale(${s})" opacity="${o}">` +
  `<path d="M10 39C2 30 0 16 10 1c10 15 8 29 0 38z" fill="#2f8c5f"/>` +
  `<path d="M10 3c6 11 6 22 0 36" fill="#5bb784" opacity=".6"/>` +
  `<path d="M10 38V5" stroke="#1e6b47" stroke-width=".8" fill="none"/></g></g>`;

export const ELEMENT_ART: Record<string, string> = {
  clipboard: `<ellipse cx="32" cy="56" rx="24" ry="5" fill="#cfe0f6"/><rect x="14" y="10" width="36" height="44" rx="6" fill="#2a6ff0"/><rect x="18" y="15" width="28" height="35" rx="3" fill="#fff"/><rect x="24" y="6" width="16" height="9" rx="3" fill="#1b4fb8"/><circle cx="24" cy="25" r="3" fill="#18a36f"/><rect x="30" y="23.5" width="12" height="3" rx="1.5" fill="#9bb8e8"/><circle cx="24" cy="34" r="3" fill="#18a36f"/><rect x="30" y="32.5" width="12" height="3" rx="1.5" fill="#9bb8e8"/><circle cx="24" cy="43" r="3" fill="#f3b53d"/><rect x="30" y="41.5" width="10" height="3" rx="1.5" fill="#9bb8e8"/>`,
  people: `<ellipse cx="32" cy="56" rx="26" ry="5" fill="#dcd8f6"/><circle cx="16" cy="26" r="6" fill="#8f7ee8"/><path d="M6 50c0-10 4-16 10-16s10 6 10 16z" fill="#7a68df"/><circle cx="48" cy="26" r="6" fill="#f2a48c"/><path d="M38 50c0-10 4-16 10-16s10 6 10 16z" fill="#f08d74"/><circle cx="32" cy="20" r="8" fill="#3d7cf0"/><path d="M18 54c0-13 6-21 14-21s14 8 14 21z" fill="#2a63d8"/>`,
  parents: `<ellipse cx="32" cy="56" rx="26" ry="5" fill="#cdeadc"/><circle cx="20" cy="18" r="7" fill="#2a6ff0"/><path d="M6 50c0-12 6-20 14-20s14 8 14 20z" fill="#1d5fd6"/><circle cx="44" cy="20" r="6.5" fill="#1fa37a"/><path d="M31 50c0-11 6-18 13-18s13 7 13 18z" fill="#16906a"/><path d="M32 54c-8-5-13-9-13-14 0-3 2.5-5.5 5.5-5.5 3 0 5.5 2 7.5 4.5 2-2.5 4.5-4.5 7.5-4.5 3 0 5.5 2.5 5.5 5.5 0 5-5 9-13 14z" fill="#ec4d6a"/>`,
  bulb: `<g stroke="#f3b53d" stroke-width="2.5" stroke-linecap="round"><path d="M32 4v5M14 12l3.5 3.5M50 12l-3.5 3.5M8 28h5M51 28h5"/></g><circle cx="32" cy="28" r="14" fill="#ffd461"/><path d="M26 38h12v5H26z" fill="#f3b53d"/><rect x="25" y="43" width="14" height="5" rx="2" fill="#3a6fd8"/><rect x="26.5" y="48" width="11" height="5" rx="2" fill="#2a5fc8"/><path d="M28 30l4 4 4-4" stroke="#e39a19" stroke-width="2" fill="none"/>`,
  growth: `<ellipse cx="32" cy="57" rx="26" ry="4" fill="#f6d9dd"/><rect class="ath-bar" x="8" y="38" width="10" height="17" rx="2" fill="#f3b53d"/><rect class="ath-bar" x="21" y="30" width="10" height="25" rx="2" fill="#17a36f"/><rect class="ath-bar" x="34" y="24" width="10" height="31" rx="2" fill="#2f7df2"/><rect class="ath-bar" x="47" y="16" width="10" height="39" rx="2" fill="#8f7ee8"/><path d="M8 32L24 20l10 6 20-18" stroke="#f39a3c" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M47 6h9v9" stroke="#f39a3c" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  planner: `<ellipse cx="32" cy="57" rx="24" ry="4" fill="#cfe0f6"/><rect x="8" y="12" width="48" height="42" rx="7" fill="#2a6ff0"/><rect x="12" y="20" width="40" height="30" rx="4" fill="#eaf2ff"/><g fill="#1b4fb8"><rect x="16" y="6" width="5" height="10" rx="2.5"/><rect x="29.5" y="6" width="5" height="10" rx="2.5"/><rect x="43" y="6" width="5" height="10" rx="2.5"/></g><rect x="16" y="24" width="14" height="10" rx="2" fill="#17a36f"/><rect x="33" y="24" width="15" height="4" rx="2" fill="#8fb3ef"/><rect x="33" y="30" width="15" height="4" rx="2" fill="#8fb3ef"/><rect x="16" y="38" width="14" height="8" rx="2" fill="#8fb3ef"/><rect x="33" y="38" width="15" height="8" rx="2" fill="#2a6ff0"/>`,
  laptop: `<rect x="10" y="12" width="44" height="30" rx="4" fill="#2a6ff0"/><rect x="14" y="16" width="36" height="22" rx="2" fill="#6aa7ff"/><path d="M4 44h56l-4 8H8z" fill="#8fb3ef"/><rect x="26" y="45" width="12" height="2" rx="1" fill="#5c86d6"/>`,
  plant: `<ellipse cx="32" cy="58" rx="18" ry="3.5" fill="#cfe7da"/>${leaf(16, 4, 0.75, -40)}${leaf(33, 2, 0.75, 35)}${leaf(24, 0, 0.8, -4)}<path d="M20 38h24l-3 18H23z" fill="#f4ede3"/><rect x="18" y="35" width="28" height="5" rx="2.5" fill="#fbf6ef"/>`,
  board: `${leaf(2, 14, 0.6, -25)}<rect x="16" y="8" width="40" height="28" rx="3" fill="#2a6ff0"/><rect x="19" y="11" width="34" height="22" rx="2" fill="#eef4ff"/><rect x="22" y="15" width="16" height="3" rx="1.5" fill="#8fb3ef"/><rect x="22" y="21" width="24" height="3" rx="1.5" fill="#8fb3ef"/><rect x="10" y="40" width="44" height="6" rx="2" fill="#f39a3c"/><rect x="14" y="46" width="4" height="10" fill="#d47f25"/><rect x="46" y="46" width="4" height="10" fill="#d47f25"/><rect x="14" y="36" width="14" height="5" rx="1" fill="#2a63d8"/>`,
  report: `<rect x="8" y="6" width="38" height="48" rx="5" fill="#2a6ff0"/><rect x="12" y="10" width="30" height="40" rx="3" fill="#fff"/><circle cx="19" cy="18" r="4" fill="#3d7cf0"/><rect x="25" y="16" width="13" height="3" rx="1.5" fill="#9bb8e8"/><rect x="16" y="36" width="4" height="9" rx="1" fill="#2a6ff0"/><rect x="22" y="31" width="4" height="14" rx="1" fill="#17a36f"/><rect x="28" y="27" width="4" height="18" rx="1" fill="#2a6ff0"/><circle cx="42" cy="40" r="10" fill="rgba(160,200,255,.35)" stroke="#1b4fb8" stroke-width="3.5"/><path d="M49 47l8 8" stroke="#1b4fb8" stroke-width="5" stroke-linecap="round"/>${leaf(44, 6, 0.55, 25)}`,
  target: `<rect x="8" y="8" width="32" height="44" rx="5" fill="#eaf2ff" stroke="#8fb3ef" stroke-width="1.5"/><circle cx="15" cy="18" r="3" fill="#17a36f"/><rect x="20" y="16.5" width="15" height="3" rx="1.5" fill="#9bb8e8"/><circle cx="15" cy="28" r="3" fill="#17a36f"/><rect x="20" y="26.5" width="15" height="3" rx="1.5" fill="#9bb8e8"/><circle cx="15" cy="38" r="3" fill="#17a36f"/><rect x="20" y="36.5" width="12" height="3" rx="1.5" fill="#9bb8e8"/><circle cx="44" cy="44" r="14" fill="#f39a3c"/><circle cx="44" cy="44" r="10" fill="#fff"/><circle cx="44" cy="44" r="6" fill="#f39a3c"/><circle cx="44" cy="44" r="2.5" fill="#fff"/><path d="M44 44l12-14" stroke="#1b4fb8" stroke-width="2.5" stroke-linecap="round"/><path d="M53 28l5-1-1 5z" fill="#f3b53d"/>`,
  targetLine: `<circle cx="32" cy="34" r="22" fill="none" stroke="#17674a" stroke-width="4"/><circle cx="32" cy="34" r="13" fill="none" stroke="#17674a" stroke-width="4"/><circle cx="32" cy="34" r="4.5" fill="#17674a"/><path d="M32 34L52 14" stroke="#17674a" stroke-width="3.5" stroke-linecap="round"/><path d="M48 8l8 0-2 8-6 0z" fill="#17674a"/>`,
};

/** Illustration and card tone for each official element (by element id). */
export const ELEMENT_LOOK: Record<string, { art: keyof typeof ELEMENT_ART; tone: "lav" | "sky" | "cream" | "pink" | "mint" }> = {
  "teacher-duty-performance": { art: "clipboard", tone: "sky" },
  "professional-community-engagement": { art: "people", tone: "lav" },
  "parent-engagement": { art: "parents", tone: "pink" },
  "teaching-strategies-variety": { art: "bulb", tone: "cream" },
  "learner-results-improvement": { art: "growth", tone: "pink" },
  "learning-plan": { art: "planner", tone: "sky" },
  "learning-technology": { art: "laptop", tone: "lav" },
  "learning-environment": { art: "plant", tone: "mint" },
  "classroom-management": { art: "board", tone: "pink" },
  "learner-results-analysis": { art: "report", tone: "lav" },
  "assessment-methods-variety": { art: "target", tone: "lav" },
};

export function lookFor(elementId?: string) {
  return (elementId && ELEMENT_LOOK[elementId]) || { art: "clipboard" as const, tone: "sky" as const };
}

export function ElementArt({ elementId, art, className }: { elementId?: string; art?: keyof typeof ELEMENT_ART; className?: string }) {
  const key = art ?? lookFor(elementId).art;
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden dangerouslySetInnerHTML={{ __html: ELEMENT_ART[key] }} />
  );
}

/** Evidence thumbnail: the element illustration on a soft panel framed by leaves. */
export function EvidenceThumb({ elementId, className }: { elementId?: string; className?: string }) {
  const key = lookFor(elementId).art;
  const html =
    `<rect width="120" height="80" fill="#eaf3fc"/>` +
    leaf(-6, 22, 1.2, -32) + leaf(96, 18, 1.1, 30) +
    `<g transform="translate(30 6) scale(1)">${ELEMENT_ART[key]}</g>`;
  return (
    <svg className={className} viewBox="0 0 120 80" preserveAspectRatio="xMidYMid slice" aria-hidden dangerouslySetInnerHTML={{ __html: html }} />
  );
}

const FOLDERS_HERO =
  leaf(4, 30, 1.5, -35) + leaf(18, 48, 1.3, -60) + leaf(124, 34, 1.4, 30) +
  `<rect x="34" y="10" width="72" height="84" rx="6" fill="#1b4fb8" transform="rotate(-8 70 52)"/>` +
  `<rect x="44" y="14" width="72" height="84" rx="6" fill="#2a6ff0"/>` +
  `<rect x="54" y="20" width="62" height="80" rx="5" fill="#fff"/>` +
  `<rect x="62" y="30" width="36" height="5" rx="2.5" fill="#c3d6f2"/><rect x="62" y="40" width="44" height="4" rx="2" fill="#dde8f8"/>` +
  `<rect class="ath-bar" x="66" y="70" width="10" height="20" rx="2" fill="#3d7cf0"/><rect class="ath-bar" x="80" y="60" width="10" height="30" rx="2" fill="#2a6ff0"/><rect class="ath-bar" x="94" y="50" width="10" height="40" rx="2" fill="#1b4fb8"/>` +
  `<rect x="50" y="10" width="6" height="18" fill="#f3b53d"/>` +
  `<circle cx="116" cy="86" r="18" fill="#f3b53d" stroke="#fff" stroke-width="3"/><path d="M116 75l3.3 6.8 7.4 1-5.4 5.2 1.3 7.4-6.6-3.5-6.6 3.5 1.3-7.4-5.4-5.2 7.4-1z" fill="#fff"/>` +
  `<path class="ath-tw" d="M130 12l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#ffd461"/>`;

const MAGNIFY_HERO =
  leaf(2, 40, 1.5, -35) + leaf(110, 30, 1.4, 30) +
  `<rect x="20" y="96" width="70" height="14" rx="3" fill="#2a6ff0"/><rect x="24" y="86" width="64" height="12" rx="3" fill="#8fb3ef"/>` +
  `<rect x="36" y="14" width="80" height="70" rx="6" fill="#fff" stroke="#c9dbf2"/><rect x="44" y="22" width="36" height="5" rx="2.5" fill="#c3d6f2"/>` +
  `<rect x="84" y="44" width="8" height="30" rx="2" fill="#2a6ff0"/><rect x="96" y="30" width="8" height="44" rx="2" fill="#17a36f"/>` +
  `<rect x="22" y="50" width="36" height="28" rx="4" fill="#2a6ff0"/><path d="M28 70l8-8 6 4 10-10" stroke="#fff" stroke-width="2.5" fill="none"/>` +
  `<g class="sc-sweep"><circle cx="94" cy="74" r="20" fill="rgba(200,225,255,.6)" stroke="#1b4fb8" stroke-width="5"/><rect x="86" y="72" width="5" height="10" fill="#17a36f"/><rect x="94" y="64" width="5" height="18" fill="#2a6ff0"/>` +
  `<path d="M108 88l18 18" stroke="#1b4fb8" stroke-width="8" stroke-linecap="round"/></g>` +
  `<g class="sc-pie"><path d="M60 110a14 14 0 0128 0z" fill="#f3b53d"/><path d="M74 96v14h14a14 14 0 00-14-14z" fill="#17a36f"/></g>` +
  `<path class="ath-tw" d="M118 12l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f3b53d"/>`;

export function HeroArt({ kind, className }: { kind: "folders" | "magnify"; className?: string }) {
  return kind === "folders" ? (
    <svg className={className} viewBox="0 0 160 110" aria-hidden dangerouslySetInnerHTML={{ __html: FOLDERS_HERO }} />
  ) : (
    <svg className={className} viewBox="0 0 150 130" aria-hidden dangerouslySetInnerHTML={{ __html: MAGNIFY_HERO }} />
  );
}

export function HeroWave() {
  return (
    <svg className="ath-wave" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden>
      <path d="M0 40c60-25 120 10 200-8s140-20 200 0v28H0z" fill="rgba(255,255,255,.07)" />
      <path d="M0 50c80-15 150 8 220-6s120-12 180 0v16H0z" fill="rgba(120,220,210,.12)" />
    </svg>
  );
}

/* ---------------- animated scenes (motion lives in athari-mockup.css) ---------------- */

const SCENE_ANALYZING =
  `<circle cx="100" cy="78" r="66" fill="#e8f2fd"/>` +
  leaf(20, 70, 1.3, -30) + leaf(160, 66, 1.2, 28) +
  `<rect x="58" y="18" width="84" height="108" rx="9" fill="#fff" stroke="#c9dbf2" stroke-width="1.5"/>` +
  `<rect x="58" y="18" width="84" height="18" rx="9" fill="#2a6ff0"/><rect x="58" y="28" width="84" height="8" fill="#2a6ff0"/>` +
  `<circle cx="70" cy="27" r="3" fill="#fff" opacity=".8"/>` +
  `<rect class="sc-line" x="68" y="48" width="56" height="5" rx="2.5" fill="#9bb8e8"/>` +
  `<rect class="sc-line" x="68" y="60" width="64" height="5" rx="2.5" fill="#9bb8e8"/>` +
  `<rect class="sc-line" x="68" y="72" width="48" height="5" rx="2.5" fill="#9bb8e8"/>` +
  `<rect class="sc-line" x="68" y="84" width="60" height="5" rx="2.5" fill="#17a36f"/>` +
  `<rect class="sc-line" x="68" y="96" width="40" height="5" rx="2.5" fill="#9bb8e8"/>` +
  `<g class="sc-lens"><circle cx="118" cy="92" r="15" fill="rgba(200,225,255,.55)" stroke="#1b4fb8" stroke-width="4"/>` +
  `<path d="M129 103l12 12" stroke="#1b4fb8" stroke-width="6" stroke-linecap="round"/></g>` +
  `<path class="ath-tw" d="M40 30l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f3b53d"/>` +
  `<path class="ath-tw sc-d2" d="M162 36l1.6 4.4 4.4 1.6-4.4 1.6-1.6 4.4-1.6-4.4-4.4-1.6 4.4-1.6z" fill="#5fe0d0"/>`;

const SCENE_SUCCESS =
  `<circle cx="100" cy="75" r="62" fill="#e9f6ef"/>` +
  leaf(24, 72, 1.2, -34) + leaf(158, 70, 1.15, 30) +
  `<g class="sc-bits">` +
  `<circle class="sc-bit b1" cx="100" cy="75" r="4" fill="#f3b53d"/>` +
  `<rect class="sc-bit b2" x="97" y="72" width="6" height="6" rx="1.5" fill="#2a6ff0"/>` +
  `<circle class="sc-bit b3" cx="100" cy="75" r="3.5" fill="#ec4d6a"/>` +
  `<rect class="sc-bit b4" x="97" y="72" width="6" height="6" rx="1.5" fill="#17a36f"/>` +
  `<circle class="sc-bit b5" cx="100" cy="75" r="3" fill="#8f7ee8"/>` +
  `<rect class="sc-bit b6" x="97.5" y="72.5" width="5" height="5" rx="1.5" fill="#f39a3c"/>` +
  `</g>` +
  `<circle cx="100" cy="75" r="36" fill="#fff"/>` +
  `<circle class="sc-ring" cx="100" cy="75" r="36" fill="none" stroke="#17674a" stroke-width="7" stroke-linecap="round" stroke-dasharray="227" transform="rotate(-90 100 75)"/>` +
  `<path class="sc-check" d="M84 76l11 11 22-24" fill="none" stroke="#17674a" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="60"/>`;

const SCENE_EMPTY =
  `<ellipse cx="100" cy="128" rx="54" ry="7" fill="#dbe7f5"/>` +
  leaf(26, 60, 1.3, -32) + leaf(154, 56, 1.25, 30) +
  `<g class="sc-bob">` +
  `<path d="M52 44a8 8 0 018-8h26l8 9h46a8 8 0 018 8v58a8 8 0 01-8 8H60a8 8 0 01-8-8z" fill="#2a6ff0"/>` +
  `<rect x="60" y="54" width="80" height="54" rx="6" fill="#fff"/>` +
  `<path d="M52 62h96v49a8 8 0 01-8 8H60a8 8 0 01-8-8z" fill="#3d7cf0"/>` +
  `<g class="sc-pulse"><circle cx="100" cy="88" r="15" fill="#fff" opacity=".95"/>` +
  `<path d="M100 81v14M93 88h14" stroke="#1b4fb8" stroke-width="3.5" stroke-linecap="round"/></g>` +
  `</g>` +
  `<path class="ath-tw" d="M150 22l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f3b53d"/>`;

const SCENE_OPENING =
  `<ellipse cx="100" cy="130" rx="56" ry="7" fill="#dbe7f5"/>` +
  leaf(24, 62, 1.3, -32) + leaf(156, 58, 1.25, 30) +
  `<path d="M50 48a8 8 0 018-8h26l8 9h50a8 8 0 018 8v62a8 8 0 01-8 8H58a8 8 0 01-8-8z" fill="#1b4fb8"/>` +
  `<g class="sc-paper p1"><rect x="62" y="30" width="44" height="58" rx="5" fill="#fff" stroke="#c9dbf2"/><rect x="69" y="40" width="28" height="4" rx="2" fill="#9bb8e8"/><rect x="69" y="50" width="22" height="4" rx="2" fill="#c3d6f2"/></g>` +
  `<g class="sc-paper p2"><rect x="80" y="24" width="44" height="58" rx="5" fill="#fff" stroke="#c9dbf2"/><rect x="87" y="60" width="6" height="14" rx="1.5" fill="#2a6ff0"/><rect x="96" y="52" width="6" height="22" rx="1.5" fill="#17a36f"/><rect x="105" y="46" width="6" height="28" rx="1.5" fill="#1b4fb8"/></g>` +
  `<g class="sc-paper p3"><rect x="98" y="32" width="40" height="54" rx="5" fill="#fff" stroke="#c9dbf2"/><circle cx="110" cy="46" r="5" fill="#17a36f"/><rect x="104" y="58" width="26" height="4" rx="2" fill="#9bb8e8"/></g>` +
  `<path d="M50 70h100v49a8 8 0 01-8 8H58a8 8 0 01-8-8z" fill="#2a6ff0"/>` +
  `<circle cx="100" cy="98" r="11" fill="#f3b53d" stroke="#fff" stroke-width="2.5"/><path d="M100 91l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill="#fff"/>` +
  `<path class="ath-tw" d="M152 20l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#f3b53d"/>`;

const SCENE_LOCKED =
  `<circle cx="100" cy="78" r="62" fill="#fdf0f2"/>` +
  leaf(24, 70, 1.2, -32) + leaf(158, 66, 1.15, 30) +
  `<g class="sc-lock">` +
  `<path d="M78 70V56a22 22 0 0144 0v14" fill="none" stroke="#8a94a6" stroke-width="9" stroke-linecap="round"/>` +
  `<rect x="66" y="66" width="68" height="54" rx="12" fill="#d8475c"/>` +
  `<circle cx="100" cy="88" r="7" fill="#fff"/><rect x="97" y="90" width="6" height="14" rx="3" fill="#fff"/>` +
  `</g>`;

export const SCENES = {
  analyzing: SCENE_ANALYZING,
  success: SCENE_SUCCESS,
  empty: SCENE_EMPTY,
  opening: SCENE_OPENING,
  locked: SCENE_LOCKED,
} as const;

export function Scene({ kind, className }: { kind: keyof typeof SCENES; className?: string }) {
  return (
    <svg
      className={`ath-scene sc-${kind} ${className ?? ""}`}
      viewBox="0 0 200 150"
      aria-hidden
      dangerouslySetInnerHTML={{ __html: SCENES[kind] }}
    />
  );
}
