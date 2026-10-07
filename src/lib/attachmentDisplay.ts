/** Display helpers for evidence attachments (names and file types). */

export function attachmentKind(mimeType: string, name: string) {
  const lower = name.toLowerCase();
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) return { label: "PDF", tone: "pdf" };
  if (mimeType.startsWith("image/") || /\.(jpe?g|png|webp)$/.test(lower)) return { label: "صورة", tone: "img" };
  if (mimeType.startsWith("video/")) return { label: "فيديو", tone: "doc" };
  if (lower.endsWith(".docx") || mimeType.includes("word")) return { label: "Word", tone: "doc" };
  return { label: "ملف", tone: "other" };
}

/**
 * A readable attachment name: no extension, no repeated owner name.
 * "نهى … المطيري - دورة كذا.pdf" → "دورة كذا"; a name that is only the owner's → "مرفق 3".
 */
export function attachmentTitle(name: string, ownerName: string, index: number) {
  const ownerWords = new Set(ownerName.split(/\s+/).filter((word) => word.length > 1));
  const isOwnerOnly = (part: string) => {
    const words = part.replace(/[\d().\-_]+/g, " ").split(/\s+/).filter(Boolean);
    const shared = words.filter((word) => ownerWords.has(word)).length;
    return !words.length || (shared >= 2 && shared >= words.length - 1);
  };
  const base = name.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/_+/g, " ").replace(/\s+/g, " ").trim();
  // Camera or system names (IMG_3644, a long hex id…) say nothing to the reader.
  if (/^(img|dsc|pxl|photo|screenshot|scan)[\s_\-]*\d/i.test(base) || /^[0-9a-f]{8}-[0-9a-f-]{20,}$/i.test(base)) {
    return `مرفق ${index + 1}`;
  }
  const kept = base.split(" - ").map((part) => part.trim()).filter((part) => part && !isOwnerOnly(part));
  return kept.length ? kept.join(" - ") : `مرفق ${index + 1}`;
}
