"use client";

import { Glyph } from "@/components/athari-ui/Ui";

export type ExcellenceSource = {
  id: string;
  title: string;
  highlight?: string;
};

type Indicator = { text: string; evidence?: { id: string; title: string } };

export function splitIndicators(text?: string) {
  return (text ?? "")
    .split(/\n+/)
    .map((line) => line.replace(/^[\s•\-–*·◆]+/, "").trim())
    .filter(Boolean);
}

/**
 * Element-level excellence indicators, rebuilt on every render from the
 * approved evidence currently linked to the element. Nothing is stored, so the
 * list follows approvals, archiving and deletion automatically, and every line
 * is either the teacher's approved wording or a count taken from the data.
 */
export function buildIndicators(
  sources: ExcellenceSource[],
  requirements: { done: number; total: number }
): Indicator[] {
  const seen = new Set<string>();
  const list: Indicator[] = [];

  for (const source of sources) {
    for (const line of splitIndicators(source.highlight)) {
      const key = line.replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      list.push({ text: line, evidence: { id: source.id, title: source.title } });
    }
  }

  if (requirements.total > 0 && requirements.done === requirements.total) {
    list.push({ text: "جميع بنود المتابعة الإلزامية لهذا العنصر موثقة بشواهد معتمدة." });
  }
  if (sources.length >= 3) {
    list.push({ text: `يدعم العنصر ${sources.length} شواهد معتمدة.` });
  }

  return list;
}

export function ElementExcellence({
  sources,
  requirements,
  onOpenEvidence,
  ownerHint = false,
}: {
  sources: ExcellenceSource[];
  requirements: { done: number; total: number };
  onOpenEvidence?: (id: string) => void;
  ownerHint?: boolean;
}) {
  const indicators = buildIndicators(sources, requirements);

  if (!indicators.length) {
    return ownerHint && sources.length ? (
      <section className="el-excel is-empty">
        <h2><Glyph name="star" size={18} />مؤشرات التميّز</h2>
        <p>لم تُضَف مؤشرات تميّز بعد. أضيفيها من صفحة مراجعة الشاهد، وستظهر هنا تلقائيًا مع رابط الشاهد الذي يثبتها.</p>
      </section>
    ) : null;
  }

  return (
    <section className="el-excel" aria-label="مؤشرات التميّز">
      <h2><Glyph name="star" size={18} />مؤشرات التميّز</h2>
      <ul>
        {indicators.map((indicator, index) => (
          <li key={index}>
            <span>{indicator.text}</span>
            {indicator.evidence ? (
              onOpenEvidence ? (
                <button type="button" className="el-excel-proof" onClick={() => onOpenEvidence(indicator.evidence!.id)}>
                  <Glyph name="doc" size={13} />{indicator.evidence.title}
                </button>
              ) : (
                <small className="el-excel-proof"><Glyph name="doc" size={13} />{indicator.evidence.title}</small>
              )
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
