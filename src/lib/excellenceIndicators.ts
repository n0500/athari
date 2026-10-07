import { splitIndicators } from "@/components/ElementExcellence";

/** Letters only: no diacritics, tatweel, punctuation or spacing differences. */
function normalize(text: string) {
  return text
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .toLowerCase();
}

/**
 * The teacher's approved excellence indicators for one evidence, exactly as
 * written (one per line), in their original order. Nothing is reworded or
 * created. A line is left out only when it repeats the evidence's own
 * description or impact, so the card never shows the same sentence twice.
 */
export function excellenceIndicatorsFor(item: {
  highlight?: string;
  description?: string;
  impact?: string;
}): string[] {
  const elsewhere = [normalize(item.description ?? ""), normalize(item.impact ?? "")].filter(Boolean);
  const seen = new Set<string>();
  const list: string[] = [];

  for (const line of splitIndicators(item.highlight)) {
    const key = normalize(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const repeated = elsewhere.some(
      (text) => text === key || (key.length >= 15 && text.includes(key))
    );
    if (!repeated) list.push(line);
  }

  return list;
}
