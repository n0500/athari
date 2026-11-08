"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import "../principal/principal-showcase.css";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import type { EvidenceRecord, ProfessionalProfile } from "@/types/athari";
/** Arabic-approved evidence label, kept local so the original site's data model stays unchanged. */
function approvedCountLabel(count: number) {
  if (count === 0) return "لا توجد شواهد معتمدة";
  if (count === 1) return "شاهد معتمد واحد";
  if (count === 2) return "شاهدان معتمدان";
  if (count <= 10) return `${count} شواهد معتمدة`;
  return `${count} شاهدًا معتمدًا`;
}

const YEAR = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

const FACT_ICONS = {
  rank: "M7 3h10v18l-5-3-5 3zM10 8h4M10 11h4",
  years: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
  org: "M4 21V7l8-4 8 4v14M9 21v-5h6v5M8 10h1M12 10h1M16 10h1M8 13h1M12 13h1M16 13h1",
  school: "M12 21s-7-6-7-11a7 7 0 0114 0c0 5-7 11-7 11zM12 12a2 2 0 100-4 2 2 0 000 4z",
};

function FactIcon({ d }: { d: string }) {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;
}

/** «واحة»: the principal page's header (designed background, identity, facts) for the teacher's own portfolio page. */
export function OasisHeader({ name, profile, covered, total, loading, showProgress = true, children }: {
  name: string; profile?: ProfessionalProfile | null; covered: number; total: number; loading: boolean; showProgress?: boolean; children?: ReactNode;
}) {
  const years = profile?.experience?.trim();
  const facts = [
    profile?.professionalRank ? { label: "الرتبة المهنية", value: profile.professionalRank, icon: FACT_ICONS.rank } : null,
    years ? { label: "سنوات الخبرة", value: /^\d+$/.test(years) ? `${years} سنة` : years, icon: FACT_ICONS.years } : null,
    profile?.educationDepartment ? { label: "الجهة", value: profile.educationDepartment, icon: FACT_ICONS.org } : null,
    profile?.school ? { label: "المدرسة", value: profile.school, icon: FACT_ICONS.school } : null,
  ].filter((fact): fact is { label: string; value: string; icon: string } => Boolean(fact));
  const role = profile?.specialization?.trim();

  return (
    <div className="ps ps-embed">
      <header className="ps-hero">
        <div className="ps-hero-text">
          <div className="ps-org">
            <img src="/athari-assets/moe-logo-t.png" alt="وزارة التعليم" />
            <span>المملكة العربية السعودية</span><span>وزارة التعليم</span>
          </div>
          <p className="ps-year">ملف الأداء المهني للعام الدراسي {YEAR}</p>
          <h1 className="ps-name">{name}</h1>
          <div className="ps-role">{profile?.professionalRank ? <span className="ps-rank">{profile.professionalRank}</span> : null}{role ? <span>{role}</span> : null}</div>
          {showProgress ? <p className="ps-embed-progress">{loading ? "جارٍ تحميل الملف…" : `العناصر الموثّقة: ${covered} من أصل ${total}`}</p> : null}
        </div>
      </header>
      {facts.length ? <section className="ps-facts" aria-label="البيانات المهنية">{facts.map((fact) =>
        <div className="ps-fact" key={fact.label}><span className="ps-fact-ic"><FactIcon d={fact.icon} /></span><div><b>{fact.label}</b><span>{fact.value}</span></div></div>)}</section> : null}
      {children ? <div className="ps-embed-actions">{children}</div> : null}
    </div>
  );
}

/** «واحة»: the principal page's designed element cards, linking to the teacher's own element pages. */
export function OasisElementCards({ evidenceByElement }: { evidenceByElement: Map<string, EvidenceRecord[]> }) {
  return (
    <div className="ps ps-embed">
      <div className="ps-grid ps-embed-grid">
        {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => {
          const count = evidenceByElement.get(element.id)?.length ?? 0;
          return (
            <div className="ps-embed-tile" key={element.id}>
              <Link className="ps-card-tile" href={`/element?id=${encodeURIComponent(element.id)}`}>
                <img src={`/athari-assets/principal/card-${element.id}.jpg`} alt={element.officialName} loading="lazy" />
                <span className="ps-card-tile-btn">{count ? `عرض الشواهد (${count})` : "لا شواهد بعد"}</span>
              </Link>
              {count > 0 ? <Link className="ps-embed-report" href={`/element?id=${encodeURIComponent(element.id)}`}>عرض الشواهد والتقارير</Link>
                : <span className="ps-embed-report off">يُتاح التقرير بعد اعتماد أول شاهد</span>}
              <span className="ps-sr">{approvedCountLabel(count)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type OasisElementEvidence = {
  id: string; title: string; description: string; impactLabel: string; impact: string;
  reviewHref: string; onOpenFile?: () => void; fileCount: number; onReport: () => void;
};

/** «واحة»: an element page laid out like the principal's element view. */
export function OasisElementView({ elementId, name, description, loading, evidence, excellence }: {
  elementId: string; name: string; description?: string; loading: boolean; evidence: OasisElementEvidence[]; excellence?: ReactNode;
}) {
  return (
    <div className="ps ps-embed ps-embed-element">
      <header className="ps-elhero">
        <Link className="ps-back no-print" href="/portfolio">العودة إلى ملف الأداء</Link>
        <div className="ps-elhero-body">
          <div className="ps-elhero-photo"><img src={`/athari-assets/principal/card-${elementId}.jpg`} alt="" /></div>
          <div>
            <h1 className="ps-sr">{name}</h1>
            <span className="ps-chip">{loading ? "…" : approvedCountLabel(evidence.length)}</span>
          </div>
        </div>
        {description ? <section className="ps-eldesc"><h2>تفسير العنصر</h2><p>{description}</p></section> : null}
      </header>
      <main className="ps-wrap">
        {excellence}
        <h2 className="ps-embed-sub">الشواهد</h2>
        {!loading && !evidence.length ? <p className="ps-embed-empty">لا توجد شواهد معتمدة لهذا العنصر بعد.</p> : null}
        <div className="ps-evlist">
          {evidence.map((item) => (
            <article className="ps-ev" key={item.id}>
              <div className="ps-ev-photos n1"><Link href={item.reviewHref} aria-label={`عرض ${item.title}`}><img src={`/athari-assets/principal/el-${elementId}.jpg`} alt="" loading="lazy" /></Link></div>
              <h3>{item.title}</h3>
              {item.description ? <p>{item.description}</p> : null}
              {item.impact ? <div className="ps-ev-out"><b>{item.impactLabel}</b>{item.impact}</div> : null}
              <div className="ps-ev-acts no-print">
                <button type="button" className="ps-btn" onClick={item.onReport}>تقرير الشاهد</button>
                {item.onOpenFile ? <button type="button" className="ps-btn ps-btn-soft" onClick={item.onOpenFile}>الأدلة الأصلية{item.fileCount > 1 ? ` (${item.fileCount})` : ""}</button> : null}
                <Link className="ps-btn ps-btn-soft" href={item.reviewHref}>عرض</Link>
              </div>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
