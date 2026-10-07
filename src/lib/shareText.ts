import type { ShareEvidence } from "@/lib/portfolioShare";

/**
 * Placeholder wording the AI writes when a field has no content, e.g.
 * «لا يوجد أثر موثق متاح حاليًا.». It is not content and must never reach the
 * principal's view, even if it was approved by mistake.
 */
const PLACEHOLDER =
  /^\s*(?:(?:لا\s+يوجد|لا\s+توجد)[^\n]*(?:موثق|متاح|متوفر|حاليًا|حاليا)|غير\s+(?:متوفر|متاح)|—|-)\s*[.。]?\s*$/;

function cleanLine(text?: string) {
  const value = (text ?? "").trim();
  return PLACEHOLDER.test(value) ? "" : value;
}

function cleanLines(text?: string) {
  return (text ?? "")
    .split(/\n+/)
    .filter((line) => !PLACEHOLDER.test(line.replace(/^\s*(?:[•\-–*·◆]\s*|[0-9٠-٩]+[.)]\s*)/, "")))
    .join("\n")
    .trim();
}

/** Evidence as the principal sees it: approved content without placeholders. */
export function presentableEvidence(item: ShareEvidence): ShareEvidence {
  return {
    ...item,
    description: cleanLine(item.description),
    impact: cleanLine(item.impact),
    highlight: cleanLines(item.highlight),
  };
}
