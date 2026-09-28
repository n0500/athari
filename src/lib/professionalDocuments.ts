import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { ensureFolder, uploadEvidenceToDrive } from "@/lib/drive";
import type { ProfessionalDocument, ProfessionalDocumentKind } from "@/types/athari";

export const DOCUMENT_SLOTS: Array<{ kind: Exclude<ProfessionalDocumentKind, "other">; label: string; hint: string }> = [
  { kind: "license", label: "الرخصة المهنية", hint: "صورة الرخصة أو ملف PDF منها." },
  { kind: "timetable", label: "جدول الحصص", hint: "جدول العام الدراسي الحالي." },
  { kind: "curriculum", label: "توزيع المنهج", hint: "خطة توزيع المقرر على الأسابيع." },
];

export const MAX_OTHER_DOCUMENTS = 3;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const DOCUMENTS_FOLDER_NAME = "الوثائق المهنية";

const KINDS = new Set<ProfessionalDocumentKind>(["license", "timetable", "curriculum", "other"]);

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeProfessionalDocuments(value: unknown): ProfessionalDocument[] {
  if (!Array.isArray(value)) return [];
  const list: ProfessionalDocument[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const raw = entry as Record<string, unknown>;
    const kind = asText(raw.kind) as ProfessionalDocumentKind;
    const driveFileId = asText(raw.driveFileId);
    if (!KINDS.has(kind) || !driveFileId) continue;
    list.push({
      id: asText(raw.id) || driveFileId,
      kind,
      label: asText(raw.label).slice(0, 80) || "وثيقة",
      originalFileName: asText(raw.originalFileName),
      mimeType: asText(raw.mimeType),
      driveFileId,
      ...(asText(raw.driveWebViewLink) ? { driveWebViewLink: asText(raw.driveWebViewLink) } : {}),
      showToPrincipal: raw.showToPrincipal !== false,
    });
  }
  return list.slice(0, DOCUMENT_SLOTS.length + MAX_OTHER_DOCUMENTS);
}

export async function getProfessionalDocuments(uid: string) {
  const snap = await getDoc(doc(requireDb(), "users", uid));
  if (!snap.exists()) return [];
  return normalizeProfessionalDocuments(snap.data().professionalDocuments);
}

export async function saveProfessionalDocuments(uid: string, documents: ProfessionalDocument[]) {
  const normalized = normalizeProfessionalDocuments(documents);
  await setDoc(
    doc(requireDb(), "users", uid),
    { professionalDocuments: normalized, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return normalized;
}

/** Uploads into «أثري / الوثائق المهنية» in the teacher's own Drive. */
export async function uploadProfessionalDocument(token: string, file: File) {
  const root = await ensureFolder(token, "أثري", "root");
  const folder = await ensureFolder(token, DOCUMENTS_FOLDER_NAME, root.id);
  return uploadEvidenceToDrive(token, file, folder.id);
}

/** Documents in display order: fixed slots first, then the teacher's own ones. */
export function orderedDocuments(documents: ProfessionalDocument[]) {
  const rank = (kind: ProfessionalDocumentKind) => {
    const index = DOCUMENT_SLOTS.findIndex((slot) => slot.kind === kind);
    return index === -1 ? DOCUMENT_SLOTS.length : index;
  };
  return [...documents].sort((a, b) => rank(a.kind) - rank(b.kind));
}
