"use client";

import { useId, useState, type KeyboardEvent } from "react";
import type { ProfessionalProfile } from "@/types/athari";
import { Glyph } from "@/components/athari-ui/Ui";

export type IdentityDocument = { key: string; label: string };

type TabKey = "about" | "data" | "achievements" | "documents";

type Row = { label: string; value: string };

function rows(list: Array<Row | false | "">) {
  return list.filter(Boolean) as Row[];
}

/**
 * Professional identity, read in a natural order:
 * who she is → current role → where she works → qualification → summary → achievements and goals.
 */
export function ProfessionalIdentityCard({
  profile,
  fallbackName = "",
  showName = false,
  documents = [],
  onOpenDocument,
}: {
  profile?: ProfessionalProfile | null;
  fallbackName?: string;
  compact?: boolean;
  showName?: boolean;
  documents?: IdentityDocument[];
  onOpenDocument?: (key: string) => void;
}) {
  const baseId = useId();
  const [active, setActive] = useState<TabKey | null>(null);
  if (!profile && !fallbackName) return null;
  const p = profile;
  const name = p?.fullName || fallbackName;
  const headline = [p?.professionalRank, p?.specialization].filter(Boolean).join(" · ");

  const groups = [
    {
      title: "المسار المهني",
      icon: "user" as const,
      items: rows([
        !!p?.professionalRank && { label: "الرتبة المهنية", value: p.professionalRank },
        !!p?.professionalLicense && { label: "الرخصة المهنية", value: p.professionalLicense },
        !!p?.experience && { label: "سنوات الخبرة", value: p.experience },
      ]),
    },
    {
      title: "جهة العمل",
      icon: "folder" as const,
      items: rows([
        !!p?.school && { label: "المدرسة", value: p.school },
        !!p?.educationDepartment && { label: "الإدارة التعليمية", value: p.educationDepartment },
        !!p?.employer && { label: "الجهة", value: p.employer },
      ]),
    },
    {
      title: "المؤهل العلمي",
      icon: "doc" as const,
      items: rows([
        !!p?.qualification && { label: "المؤهل", value: p.qualification },
        !!p?.specialization && { label: "التخصص", value: p.specialization },
        !!p?.university && { label: "جهة التخرج", value: p.university },
      ]),
    },
  ].filter((group) => group.items.length);

  const achievements = p?.achievements ?? [];
  const goals = p?.developmentGoals ?? [];

  const about = (
    <>
      {p?.bio ? <p className="pid-bio">{p.bio}</p> : null}
      {p?.vision || p?.mission ? (
        <div className="pid-vm">
          {p?.vision ? (
            <div className="pid-vm-item">
              <h3><Glyph name="eye" size={16} />رؤيتي</h3>
              <p>{p.vision}</p>
            </div>
          ) : null}
          {p?.mission ? (
            <div className="pid-vm-item">
              <h3><Glyph name="star" size={16} />رسالتي</h3>
              <p>{p.mission}</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );

  const data = groups.length ? (
    <div className="pid-groups">
      {groups.map((group) => (
        <div className="pid-group" key={group.title}>
          <h3><Glyph name={group.icon} size={16} />{group.title}</h3>
          <dl>
            {group.items.map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  ) : null;

  const achievementsBlock = (
    <>
      {achievements.length ? (
        <div className="pid-list">
          <h3><Glyph name="star" size={16} />أبرز المنجزات</h3>
          <ul>{achievements.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      {goals.length ? (
        <div className="pid-list">
          <h3><Glyph name="chart" size={16} />أهداف التطوير المهني</h3>
          <ul>{goals.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
    </>
  );

  const documentsBlock = documents.length ? (
    <div className="pd-share-grid">
      {documents.map((entry) => (
        <button type="button" key={entry.key} onClick={() => onOpenDocument?.(entry.key)}>
          <span className="pd-ic"><Glyph name="doc" size={20} /></span>
          <strong>{entry.label}</strong>
          <small>عرض</small>
        </button>
      ))}
    </div>
  ) : null;

  const tabs = [
    { key: "about" as const, label: "الرؤية والرسالة", has: Boolean(p?.bio || p?.vision || p?.mission), body: about },
    { key: "data" as const, label: "البيانات", has: Boolean(data), body: data },
    { key: "achievements" as const, label: "المنجزات", has: Boolean(achievements.length || goals.length), body: achievementsBlock },
    { key: "documents" as const, label: "الوثائق", has: Boolean(documents.length), body: documentsBlock },
  ].filter((tab) => tab.has);

  const current = tabs.find((tab) => tab.key === active) ?? tabs[0];

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!current) return;
    const index = tabs.findIndex((tab) => tab.key === current.key);
    // RTL: ArrowLeft moves forward, ArrowRight moves back.
    const step = event.key === "ArrowLeft" ? 1 : event.key === "ArrowRight" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    setActive(next.key);
    document.getElementById(`${baseId}-tab-${next.key}`)?.focus();
  }

  return (
    <section className="ath-panel pid">
      <header className="pid-head">
        <span className="pid-avatar" aria-hidden>{(name || "أ").replace(/^أ\.\s*/, "").charAt(0)}</span>
        <div>
          <span className="pid-kicker">الهوية المهنية</span>
          {showName && name ? <h2>{name}</h2> : null}
          {headline ? <p className="pid-headline">{headline}</p> : !showName ? <p className="pid-headline">{name}</p> : null}
        </div>
      </header>

      {tabs.length > 1 ? (
        <div
          className="pid-tabs no-print"
          role="tablist"
          aria-label="أقسام الهوية المهنية"
          style={{ gridTemplateColumns: tabs.map((tab) => (tab.key === "about" ? "1.5fr" : "1fr")).join(" ") }}
          onKeyDown={onKey}
        >
          {tabs.map((tab) => {
            const on = tab.key === current?.key;
            return (
              <button
                type="button"
                role="tab"
                key={tab.key}
                id={`${baseId}-tab-${tab.key}`}
                aria-selected={on}
                aria-controls={`${baseId}-panel-${tab.key}`}
                tabIndex={on ? 0 : -1}
                className={on ? "on" : ""}
                onClick={() => setActive(tab.key)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      ) : null}

      {tabs.map((tab) => (
        <div
          key={tab.key}
          id={`${baseId}-panel-${tab.key}`}
          role={tabs.length > 1 ? "tabpanel" : undefined}
          aria-labelledby={tabs.length > 1 ? `${baseId}-tab-${tab.key}` : undefined}
          className={`pid-panel ${tab.key === current?.key ? "is-on" : ""}`}
          data-title={tab.label}
        >
          {tab.body}
        </div>
      ))}
    </section>
  );
}
