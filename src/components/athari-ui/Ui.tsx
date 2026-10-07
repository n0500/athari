"use client";

import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { AuthGate } from "@/components/AuthGate";
import { ElementArt, EvidenceThumb, HeroArt, HeroWave, lookFor } from "./Art";

/* ---------------- helpers ---------------- */

export function evidenceLabel(n: number) {
  if (n === 1) return "شاهد معتمد";
  if (n === 2) return "شاهدان معتمدان";
  if (n >= 3 && n <= 10) return `${n} شواهد معتمدة`;
  return `${n} شاهدًا معتمدًا`;
}
/** Same as evidenceLabel but always starts with the number (mockup style "1 شاهد معتمد"). */
export function evidenceCountLabel(n: number) {
  if (n === 1) return "1 شاهد معتمد";
  if (n === 2) return "شاهدان معتمدان";
  return evidenceLabel(n);
}
export function filesLabel(n: number) {
  if (n === 1) return "ملف واحد";
  if (n === 2) return "ملفان";
  if (n >= 3 && n <= 10) return `${n} ملفات`;
  return `${n} ملفًا`;
}
export function elementsLabel(n: number) {
  if (n === 1) return "عنصر تقييم واحد";
  if (n === 2) return "عنصرا تقييم";
  if (n >= 3 && n <= 10) return `${n} عناصر تقييم`;
  return `${n} عنصر تقييم`;
}
export function categoryLabel(category?: string) {
  if (category === "common") return "العناصر المشتركة";
  if (category === "role_responsibility") return "الأدوار والمسؤوليات";
  if (category === "additional_assignment") return "التكليفات الإضافية";
  return "";
}

type Tap = { href?: string; onClick?: () => void; disabled?: boolean };

function Tappable({ href, onClick, disabled, className, children, label }: Tap & { className: string; children: ReactNode; label?: string }) {
  if (href && !disabled) {
    return <Link className={className} href={href} aria-label={label}>{children}</Link>;
  }
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={label}>
      {children}
    </button>
  );
}

/** Counts up to `value` once (instant when the viewer prefers reduced motion). */
export function CountUp({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || value <= 0) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 1100;
    const tick = (now: number) => {
      const k = Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    setShown(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <>{shown}</>;
}

/* ---------------- glyphs ---------------- */

export type GlyphName =
  | "shield" | "user" | "cal" | "eye" | "download" | "lock" | "doc" | "docOutline" | "folder"
  | "bars" | "check" | "empty" | "emptyRed" | "chevLeft" | "chevRight" | "dots" | "star" | "layers" | "chart"
  | "plus" | "upload" | "clock" | "archive" | "trash" | "sparkle" | "alert" | "external" | "logout";

export function Glyph({ name, size = 20, className }: { name: GlyphName; size?: number; className?: string }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": true, className };
  switch (name) {
    case "shield": return <svg {...p}><path d="M12 2l8 3v6c0 5-3.5 9.2-8 11-4.5-1.8-8-6-8-11V5z" fill="#1d4a3a"/><path d="M8.5 12l2.4 2.4 4.6-5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "user": return <svg {...p}><circle cx="12" cy="8" r="4.2" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21c1.2-4.4 4.3-6.5 8-6.5s6.8 2.1 8 6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>;
    case "cal": return <svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="3" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/><g fill="currentColor"><circle cx="8" cy="14" r="1"/><circle cx="12" cy="14" r="1"/><circle cx="16" cy="14" r="1"/><circle cx="8" cy="17" r="1"/><circle cx="12" cy="17" r="1"/></g></svg>;
    case "eye": return <svg {...p}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" strokeWidth="1.9"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>;
    case "download": return <svg {...p}><path d="M12 3v11m0 0l-4.5-4.5M12 14l4.5-4.5M4 15v3a3 3 0 003 3h10a3 3 0 003-3v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "lock": return <svg {...p}><rect x="5" y="10.5" width="14" height="10.5" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 018 0v2.5" fill="none" stroke="currentColor" strokeWidth="2"/><circle cx="12" cy="15.5" r="1.6" fill="#fff"/></svg>;
    case "doc": return <svg {...p}><path d="M6 2.5h8l5 5V20a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 20V4a1.5 1.5 0 011-1.5z" fill="currentColor"/><path d="M8.5 12h7M8.5 15h7M8.5 18h4.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "docOutline": return <svg {...p}><path d="M6.5 2.5h7.5l5 5V20a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 20V4a1.5 1.5 0 011.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.7"/><path d="M8.5 12h7M8.5 15.5h7M8.5 19h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
    case "folder": return <svg {...p}><path d="M3 6.5A2.5 2.5 0 015.5 4h4l2 2.2h7A2.5 2.5 0 0121 8.7V18a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 18z" fill="currentColor"/><path d="M3 9.5h18" stroke="#fff" strokeOpacity=".5" strokeWidth="1.4"/></svg>;
    case "bars": return <svg {...p}><rect x="3" y="12" width="4.5" height="9" rx="1.6" fill="#3aa6e8"/><rect x="9.8" y="7" width="4.5" height="14" rx="1.6" fill="#1d5fd6"/><rect x="16.5" y="3" width="4.5" height="18" rx="1.6" fill="#16a57a"/></svg>;
    case "chart": return <svg {...p}><g fill="currentColor"><rect x="4" y="11" width="4" height="9" rx="1.2"/><rect x="10" y="5" width="4" height="15" rx="1.2"/><rect x="16" y="9" width="4" height="11" rx="1.2"/></g></svg>;
    case "check": return <svg {...p}><circle cx="12" cy="12" r="11" fill="#17674a"/><path d="M7 12.4l3.3 3.3L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "empty": return <svg {...p}><circle cx="12" cy="12" r="10.2" fill="#fff" stroke="#a9b3c1" strokeWidth="1.5"/></svg>;
    case "emptyRed": return <svg {...p}><circle cx="12" cy="12" r="9.5" fill="none" stroke="#d8475c" strokeWidth="2"/></svg>;
    case "chevLeft": return <svg {...p}><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "chevRight": return <svg {...p}><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "dots": return <svg {...p}><g fill="currentColor"><circle cx="8" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></g></svg>;
    case "star": return <svg {...p}><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" fill="currentColor"/></svg>;
    case "plus": return <svg {...p}><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>;
    case "upload": return <svg {...p}><path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4 15v3a3 3 0 003 3h10a3 3 0 003-3v-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9" fill="currentColor"/><path d="M12 7v5l3 2" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>;
    case "archive": return <svg {...p}><path d="M4 8h16v11a2 2 0 01-2 2H6a2 2 0 01-2-2z M3 4h18v4H3z M9.5 12h5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg>;
    case "trash": return <svg {...p}><path d="M4 7h16M9 7V4h6v3M6.5 7l1 13h9l1-13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/></svg>;
    case "sparkle": return <svg {...p}><path d="M12 2.5l1.8 5.2 5.2 1.8-5.2 1.8-1.8 5.2-1.8-5.2L5 9.5l5.2-1.8z" fill="currentColor"/><path d="M18.5 14.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z" fill="currentColor"/></svg>;
    case "alert": return <svg {...p}><path d="M12 3L2.5 20h19z" fill="currentColor"/><path d="M12 9.5v4.5M12 17h.01" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/></svg>;
    case "external": return <svg {...p}><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1h5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "logout": return <svg {...p}><path d="M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 16l-4-4 4-4M6 12h10" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    case "layers": return <svg {...p}><path d="M12 3l9 5-9 5-9-5z M3 12.5l9 5 9-5 M3 16.5l9 5 9-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
  }
}

function LogoMark() {
  return (
    <svg viewBox="0 0 48 40" width="44" height="36" aria-hidden>
      <path d="M4 4l18 6v28L4 32z" fill="#2f7df2" />
      <path d="M26 10l18-6v28l-18 6z" fill="#f6a53c" />
      <path d="M22 10h4v28h-4z" fill="#1b4fb8" />
    </svg>
  );
}

/* ---------------- shell ---------------- */

export function AthShell({
  children,
  title,
  subtitle,
  chips = [],
  showNav = true,
  back,
  accountHref = "/account",
  publicPage = false,
  wide = false,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  chips?: string[];
  showNav?: boolean;
  back?: Tap;
  accountHref?: string | null;
  /** The principal's shared view is public; every other page needs a signed-in teacher. */
  publicPage?: boolean;
  /** Uses the width of a laptop or desktop screen instead of a phone-width column. */
  wide?: boolean;
}) {
  const content = (
    <>
      {title ? (
        <div className="ath-page-head">
          <h1>{title}</h1>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
      ) : null}
      {children}
    </>
  );
  return (
    <div className="ath">
      <div className={`ath-frame ${showNav ? "has-nav" : ""} ${wide ? "is-wide" : ""}`}>
        <header className="ath-top no-print">
          {back ? (
            <Tappable {...back} className="ath-back" label="رجوع"><Glyph name="chevRight" size={18} /></Tappable>
          ) : null}
          <div className="ath-brand"><LogoMark />أثري</div>
          <span className="ath-spacer" />
          {chips.map((chip) => (
            <span className="ath-chip" key={chip}><Glyph name="shield" size={18} />{chip}</span>
          ))}
          {accountHref ? (
            <Link className="ath-avatar" href={accountHref} aria-label="الحساب"><Glyph name="user" size={24} /></Link>
          ) : (
            <span className="ath-avatar" aria-hidden><Glyph name="user" size={24} /></span>
          )}
        </header>
        <main className="ath-main">
          {publicPage ? content : <AuthGate>{content}</AuthGate>}
        </main>
      </div>
      {showNav ? <div className="no-print"><BottomNav /></div> : null}
    </div>
  );
}

/* ---------------- screen 1 pieces ---------------- */

export function CoverageRing({ percent, loading }: { percent: number; loading?: boolean }) {
  const circumference = 2 * Math.PI * 42;
  const filled = (Math.max(0, Math.min(100, percent)) / 100) * circumference;
  return (
    <div className="ath-ring" aria-label={`نسبة تغطية الإطار ${percent}٪`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="9" />
        {percent > 0 ? (
          <circle className="ath-ring-fill" cx="50" cy="50" r="42" fill="none" stroke="#5fe0d0" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${filled} ${circumference}`} />
        ) : null}
      </svg>
      <div className="ath-ring-v"><b>{loading ? "…" : <><CountUp value={percent} />%</>}</b><span>تغطية الإطار</span></div>
    </div>
  );
}

export function PortfolioHero({
  year, name, evidenceCount, covered, total, loading, browse, print, browseLabel = "استعراض الشواهد", extra,
  showCoverage = true,
}: {
  year: string; name: string; evidenceCount: number; covered: number; total: number; loading?: boolean;
  browse: Tap; print?: Tap; browseLabel?: string; extra?: ReactNode;
  /** false in the principal's view: show what is documented, never a ratio or a gap. */
  showCoverage?: boolean;
}) {
  const percent = total ? Math.round((covered / total) * 100) : 0;
  return (
    <section className={`ath-hero ${showCoverage ? "" : "has-cutout"}`}>
      {!showCoverage ? <img className="ath-hero-cutout" src="/athari-assets/hero-cutout.webp" alt="" aria-hidden="true" /> : null}
      <div className="ath-hero-row">
        <div className="ath-hero-text">
          <span className="ath-pill-out"><Glyph name="cal" size={16} />العام الدراسي {year}</span>
          <h1>ملف الأداء المهني{name ? <><br />{name}</> : null}</h1>
        </div>
        {showCoverage ? <CoverageRing percent={percent} loading={loading} /> : null}
        {!showCoverage && !loading ? (
          <div className="ath-hero-figs">
            <div className="fig"><b>{evidenceCount}</b><span>{evidenceCount === 1 ? "شاهد معتمد" : evidenceCount === 2 ? "شاهدان معتمدان" : evidenceCount <= 10 ? "شواهد معتمدة" : "شاهدًا معتمدًا"}</span></div>
            <div className="fig"><b>{covered}</b><span>{covered === 1 ? "عنصر موثق" : covered === 2 ? "عنصران موثقان" : covered <= 10 ? "عناصر موثقة" : "عنصرًا موثقًا"}</span></div>
          </div>
        ) : null}
      </div>
      <p className="ath-hero-meta">
        {loading
          ? "جاري تحميل الملف…"
          : showCoverage
          ? <>{evidenceCountLabel(evidenceCount)} &nbsp;•&nbsp; {covered} من {total} عنصر تقييم</>
          : <>{evidenceCountLabel(evidenceCount)} &nbsp;•&nbsp; موزعة على {elementsLabel(covered)}</>}
      </p>
      <div className="ath-hero-btns no-print">
        <Tappable {...browse} className="ath-btn primary"><Glyph name="eye" />{browseLabel}</Tappable>
        {print ? <Tappable {...print} className="ath-btn white"><Glyph name="download" />طباعة / حفظ PDF</Tappable> : null}
        {extra}
      </div>
      <HeroWave />
    </section>
  );
}

export function StatStrip({
  first, evidenceCount, covered, total, showTotal = true,
}: {
  first: { title: string; sub: string };
  evidenceCount: number; covered: number; total: number;
  /** false in the principal's view: the number of documented elements only. */
  showTotal?: boolean;
}) {
  return (
    <section className="ath-stats">
      <div className="ath-stat s1"><div><span className="tt">{first.title}</span><small>{first.sub}</small></div><span className="ic"><Glyph name="lock" size={22} /></span></div>
      <div className="ath-stat s2"><div><b><CountUp value={evidenceCount} /></b><small>شواهد معتمدة</small></div><span className="ic"><Glyph name="doc" size={22} /></span></div>
      <div className="ath-stat s3"><div>{showTotal
        ? <><b><CountUp value={covered} /> من {total}</b><small>عنصر تقييم مغطى</small></>
        : <><b><CountUp value={covered} /></b><small>عناصر تقييم موثقة</small></>}</div><span className="ic"><Glyph name="folder" size={22} /></span></div>
    </section>
  );
}

export function SectionHead({ icon, title, sub, side }: { icon: ReactNode; title: string; sub?: string; side?: ReactNode }) {
  return (
    <div className="ath-sec-head">
      <div><h2>{icon}{title}</h2>{sub ? <p>{sub}</p> : null}</div>
      {side}
    </div>
  );
}

export function CountChip({ total }: { total: number }) {
  return <span className="ath-count-chip"><Glyph name="dots" size={16} />{elementsLabel(total)}</span>;
}

export type ElementSummary = { id: string; name: string; count: number };

export function ElementGrid({ elements, tapFor }: { elements: ElementSummary[]; tapFor: (id: string) => Tap }) {
  return (
    <div className="ath-grid">
      {elements.map((element) => {
        const look = lookFor(element.id);
        const ok = element.count > 0;
        return (
          <Tappable key={element.id} {...tapFor(element.id)} className={`ath-el tone-${look.tone} ${ok ? "is-covered" : ""}`}>
            <span className="txt">
              <span className="nm">{element.name}</span>
              <span className={`ev ${ok ? "on" : "off"}`}>
                {ok ? <>{evidenceCountLabel(element.count)}<Glyph name="docOutline" size={14} /></> : "لا يوجد شاهد معتمد"}
              </span>
            </span>
            <ElementArt elementId={element.id} className="art" />
            <Glyph name={ok ? "check" : "empty"} size={24} className={ok ? "mark on" : "mark"} />
          </Tappable>
        );
      })}
    </div>
  );
}

export type EvidenceTile = {
  id: string; title: string; description?: string; elementId?: string; elementName?: string; view: Tap;
};

export function EvidenceTiles({ items }: { items: EvidenceTile[] }) {
  return (
    <div className="ath-ev-row">
      {items.map((item) => {
        const look = lookFor(item.elementId);
        return (
          <article className="ath-ev-card" key={item.id}>
            <div className="pic">
              <EvidenceThumb elementId={item.elementId} />
              <Glyph name="check" size={22} className="ok" />
            </div>
            {item.elementName ? <span className={`ath-tag tone-${look.tone}`}>{item.elementName}</span> : null}
            <h3>{item.title}</h3>
            {item.description ? <p>{item.description}</p> : null}
            <Tappable {...item.view} className="ath-btn outline small no-print"><Glyph name="eye" />عرض الشاهد</Tappable>
          </article>
        );
      })}
    </div>
  );
}

/* ---------------- screen 2 pieces ---------------- */

export function FileHero({ year, title, evidenceCount, covered, total, loading }: {
  year: string; title: string; evidenceCount: number; covered: number; total: number; loading?: boolean;
}) {
  return (
    <section className="ath-hero">
      <div className="ath-hero-row">
        <div className="ath-hero-text">
          <span className="ath-pill-out"><Glyph name="cal" size={16} />العام الدراسي {year}</span>
          <h1>{title}</h1>
        </div>
        <HeroArt kind="folders" className="ath-hero-art" />
      </div>
      <div className="ath-hero-stats">
        <div className="hs"><div><b>{loading ? "…" : <><CountUp value={covered} /> من {total}</>}</b><small>عناصر مغطاة</small></div><span className="ic blue"><Glyph name="bars" /></span></div>
        <div className="hs"><div><b>{loading ? "…" : <CountUp value={evidenceCount} />}</b><small>شواهد معتمدة</small></div><span className="ic green"><Glyph name="doc" /></span></div>
      </div>
      <HeroWave />
    </section>
  );
}

export function Panel({ icon, iconTone = "mint", title, sub, children }: {
  icon: ReactNode; iconTone?: "mint" | "blue"; title: string; sub?: string; children: ReactNode;
}) {
  return (
    <section className="ath-panel">
      <div className="ath-ph">
        <span className={`sq ${iconTone}`}>{icon}</span>
        <div><h2>{title}</h2>{sub ? <p className="sub">{sub}</p> : null}</div>
      </div>
      {children}
    </section>
  );
}

export function QuoteBox({ children }: { children: ReactNode }) {
  return <div className="ath-quote"><span className="qm" aria-hidden>”</span>{children}</div>;
}

export function ElementRows({ elements, tapFor }: { elements: ElementSummary[]; tapFor: (id: string) => Tap }) {
  return (
    <div className="ath-rows">
      {elements.map((element, index) => {
        const ok = element.count > 0;
        return (
          <Tappable key={element.id} {...tapFor(element.id)} className={`ath-row ${ok ? "ok" : "no"}`}>
            <ElementArt elementId={element.id} className="ri" />
            <span className="num">{index + 1}</span>
            <span className="nm">{element.name}</span>
            <span className="st">
              {ok ? <>{evidenceCountLabel(element.count)}<Glyph name="check" size={18} /></> : <>غير مغطى<Glyph name="emptyRed" size={18} /></>}
            </span>
            <Glyph name="chevLeft" size={14} className="chev" />
          </Tappable>
        );
      })}
    </div>
  );
}

/* ---------------- screen 3 pieces ---------------- */

export type DetailEvidence = { id: string; title: string; description?: string; fileCount: number; view: Tap; extra?: ReactNode };

const SUPPORT_LOOK = [
  { art: "report" as const, tone: "sky" },
  { art: "people" as const, tone: "lav" },
  { art: "targetLine" as const, tone: "mint" },
];

export function ElementDetail({
  elementId, name, category, description, supports, evidence, loading, crumbs, excellence, evidenceList,
}: {
  elementId: string; name: string; category?: string; description?: string; supports: string[];
  evidence: DetailEvidence[]; loading?: boolean; excellence?: ReactNode;
  crumbs: { label: string; tap?: Tap }[];
  /** Replaces the default evidence rows (the principal's view uses its own cards). */
  evidenceList?: ReactNode;
}) {
  const cat = categoryLabel(category);
  return (
    <>
      <nav className="ath-crumbs no-print" aria-label="مسار الصفحة">
        {crumbs.map((crumb) => (
          <span className="c" key={crumb.label}>
            {crumb.tap ? <Tappable {...crumb.tap} className="lnk">{crumb.label}</Tappable> : <span className="lnk">{crumb.label}</span>}
            <Glyph name="chevLeft" size={10} />
          </span>
        ))}
        <span className="cur">{name}</span>
      </nav>

      <section className="ath-hero3">
        <div className="ath-hero-row">
          <div className="ath-hero-text">
            <span className="ath-pill3"><Glyph name="bars" size={16} />عنصر التقييم</span>
            <h1>{name}</h1>
            {cat ? <span className="ath-pill3 light"><Glyph name="layers" size={16} />الفئة: <b>{cat}</b></span> : null}
          </div>
          <HeroArt kind="magnify" className="ath-hero-art small" />
        </div>
        <div className="ath-hero3-chips">
          <span className="ath-pillw"><Glyph name="chart" size={18} />{loading ? "…" : evidence.length ? evidenceCountLabel(evidence.length) : "لا يوجد شاهد معتمد"}</span>
          {!loading ? (
            evidence.length ? (
              <span className="ath-pillw good"><Glyph name="star" size={18} />عنصر مغطى</span>
            ) : (
              <span className="ath-pillw warn">غير مغطى بعد</span>
            )
          ) : null}
        </div>
      </section>

      {excellence}

      {description ? (
        <Panel icon={<Glyph name="docOutline" size={24} />} title="تفسير العنصر">
          <QuoteBox>{description}</QuoteBox>
        </Panel>
      ) : null}

      {supports.length ? (
        <Panel
          icon={<ElementArt art="bulb" className="sq-art" />}
          title="ما الذي يدعم هذا العنصر؟"
          sub="من تفسير العنصر في الدليل المعتمد."
        >
          <div className="ath-sup-grid">
            {supports.slice(0, 3).map((support, index) => (
              <div className={`ath-sup tone-${SUPPORT_LOOK[index % 3].tone}`} key={support}>
                <ElementArt art={SUPPORT_LOOK[index % 3].art} />
                <p>{support}</p>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel
        icon={<Glyph name="folder" size={24} />}
        title="الشواهد المعتمدة"
        sub={loading ? "جاري التحميل…" : evidence.length ? evidenceCountLabel(evidence.length) : "لا توجد شواهد معتمدة لهذا العنصر"}
      >
        {evidenceList ?? <div className="ath-ev-list">
          {evidence.map((item) => (
            <article className="ath-ev-item" key={item.id}>
              <div className="bd">
                <div className="head">
                  <h3>{item.title}</h3>
                  <span className="ok-tag">معتمد<Glyph name="check" size={16} /></span>
                </div>
                {item.description ? <p>{item.description}</p> : null}
                {item.extra}
                <div className="ft">
                  <span className="files">{filesLabel(item.fileCount)}<Glyph name="docOutline" size={14} /></span>
                  <Tappable {...item.view} className="view no-print">عرض<Glyph name="eye" size={16} /></Tappable>
                </div>
              </div>
              <div className="th"><EvidenceThumb elementId={elementId} /></div>
            </article>
          ))}
          {!loading && !evidence.length ? (
            <div className="ath-empty">
              <ElementArt elementId={elementId} className="ea" />
              <strong>لا يوجد شاهد معتمد لهذا العنصر حتى الآن</strong>
            </div>
          ) : null}
        </div>}
      </Panel>
    </>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: ReactNode }) {
  return <div className={`ath-notice ${tone}`}>{children}</div>;
}

/* ---------------- generic pieces for the remaining screens ---------------- */

/** Teal hero used by home, evidence list and account screens. */
export function PageHero({
  eyebrow, title, sub, side, actions, art,
}: {
  eyebrow?: ReactNode; title: ReactNode; sub?: ReactNode; side?: ReactNode; actions?: ReactNode;
  art?: "folders" | "magnify";
}) {
  return (
    <section className="ath-hero">
      <div className="ath-hero-row">
        <div className="ath-hero-text">
          {eyebrow ? <span className="ath-pill-out">{eyebrow}</span> : null}
          <h1>{title}</h1>
          {sub ? <p className="ath-hero-sub">{sub}</p> : null}
        </div>
        {side ?? (art ? <HeroArt kind={art} className="ath-hero-art" /> : null)}
      </div>
      {actions ? <div className="ath-hero-btns no-print">{actions}</div> : null}
      <HeroWave />
    </section>
  );
}

export type MiniStat = { value: ReactNode; label: string; tone: "s1" | "s2" | "s3" | "s4"; icon: GlyphName };

export function MiniStats({ stats }: { stats: MiniStat[] }) {
  return (
    <section className="ath-stats even">
      {stats.map((stat) => (
        <div className={`ath-stat ${stat.tone}`} key={stat.label}>
          <div><b>{stat.value}</b><small>{stat.label}</small></div>
          <span className="ic"><Glyph name={stat.icon} size={22} /></span>
        </div>
      ))}
    </section>
  );
}

export function StatusTag({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    approved: ["معتمد", "good"],
    needs_info: ["يحتاج معلومة", "warn"],
    ready_for_review: ["جاهز للمراجعة", "info"],
    analysis_failed: ["تعذر التحليل", "bad"],
    analyzing: ["قيد التحليل", "info"],
    uploaded: ["تم الحفظ", "info"],
    uploading: ["جاري الرفع", "info"],
    draft: ["مسودة", "info"],
    archived: ["مؤرشف", "info"],
  };
  const [label, tone] = map[status] ?? ["قيد المتابعة", "info"];
  return (
    <span className={`ath-status ${tone}`}>
      {tone === "good" ? <Glyph name="check" size={16} /> : null}
      {label}
    </span>
  );
}

export function Tabs<T extends string>({ value, onChange, options }: {
  value: T; onChange: (value: T) => void; options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="ath-tabs" role="tablist">
      {options.map((option) => (
        <button
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={value === option.value ? "on" : ""}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
          {option.count !== undefined ? <b>{option.count}</b> : null}
        </button>
      ))}
    </div>
  );
}

export function ActionTile({ href, title, sub, elementArt, tone }: {
  href: string; title: string; sub: string; elementArt: string; tone: "lav" | "sky" | "cream" | "pink" | "mint";
}) {
  return (
    <Link href={href} className={`ath-el tone-${tone} ath-tile`}>
      <span className="txt"><span className="nm">{title}</span><span className="ev off">{sub}</span></span>
      <ElementArt art={elementArt} className="art" />
    </Link>
  );
}

export { ElementArt, EvidenceThumb };
