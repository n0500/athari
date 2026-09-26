import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { AiAnalysis, ApprovedContent, EvidenceRecord, FrameworkElement } from "@/types/athari";

export async function ensureUserProfile(uid: string, data: { displayName?: string | null; email?: string | null }) {
  await setDoc(doc(requireDb(), "users", uid), {
    displayName: data.displayName ?? "", email: data.email ?? "", role: "teacher", updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function computeEvidenceHash(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createEvidenceDraft(input: { ownerUid: string; academicYear: string; file: File; contentHash?: string }) {
  const ref = await addDoc(collection(requireDb(), "evidence"), {
    ownerUid: input.ownerUid, academicYear: input.academicYear, status: "uploading",
    originalFileName: input.file.name, mimeType: input.file.type || "application/octet-stream",
    fileSize: input.file.size, ...(input.contentHash ? { contentHash: input.contentHash } : {}),
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function setEvidenceContentHash(evidenceId: string, contentHash: string) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), { contentHash, updatedAt: serverTimestamp() });
}

export async function attachDriveFile(evidenceId: string, data: { driveFileId: string; driveWebViewLink?: string; driveParentFolderId: string }) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), { ...data, status: "uploaded", updatedAt: serverTimestamp() });
}
export async function markAnalyzing(evidenceId: string) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), { status: "analyzing", updatedAt: serverTimestamp() });
}
export async function saveAnalysis(evidenceId: string, analysis: AiAnalysis) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    aiAnalysis: analysis, status: analysis.missingInformation ? "needs_info" : "ready_for_review", updatedAt: serverTimestamp(),
  });
}
export async function markAnalysisFailed(evidenceId: string, message: string) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), { status: "analysis_failed", analysisError: message.slice(0,500), updatedAt: serverTimestamp() });
}
export async function getEvidence(evidenceId: string): Promise<EvidenceRecord | null> {
  const snap = await getDoc(doc(requireDb(), "evidence", evidenceId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as EvidenceRecord;
}
export async function approveEvidence(evidenceId: string, approvedContent: ApprovedContent, newDriveParentFolderId: string) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    approvedContent, driveParentFolderId: newDriveParentFolderId, status: "approved",
    approvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}

function stampMillis(value: unknown) {
  const v = value as { toMillis?: () => number; seconds?: number } | undefined;
  if (typeof v?.toMillis === "function") return v.toMillis();
  if (typeof v?.seconds === "number") return v.seconds * 1000;
  return 0;
}
function createdAtMillis(record: EvidenceRecord) { return stampMillis(record.createdAt); }

export async function listUserEvidence(uid: string, options?: { includeArchived?: boolean }) {
  const q = query(collection(requireDb(), "evidence"), where("ownerUid", "==", uid), limit(250));
  const snaps = await getDocs(q);
  return snaps.docs.map((d) => ({ id: d.id, ...d.data() }) as EvidenceRecord)
    .filter((item) => options?.includeArchived || item.status !== "archived")
    .sort((a,b) => createdAtMillis(b) - createdAtMillis(a));
}

export async function findDuplicateEvidence(input: { uid: string; academicYear: string; file: File; contentHash: string }) {
  const items = await listUserEvidence(input.uid);
  const exact = items.find((item) => item.academicYear === input.academicYear && item.contentHash === input.contentHash);
  if (exact) return exact;
  return items.find((item) => item.academicYear === input.academicYear && !item.contentHash && item.originalFileName === input.file.name && item.fileSize === input.file.size) ?? null;
}

export async function archiveEvidence(evidenceId: string, reason = "manual_archive") {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    status: "archived", archiveReason: reason, archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
}
export async function deleteEvidenceRecord(evidenceId: string) {
  await deleteDoc(doc(requireDb(), "evidence", evidenceId));
}

const PRIORITY: Record<string, number> = {
  approved: 100, ready_for_review: 80, needs_info: 75, analyzing: 50,
  uploaded: 45, uploading: 40, analysis_failed: 10, draft: 5,
};
function duplicateKey(item: EvidenceRecord) {
  const year = item.academicYear || "";
  return item.contentHash ? `${year}|hash:${item.contentHash}` : `${year}|legacy:${item.originalFileName}|${item.fileSize}`;
}
function comparePreferred(a: EvidenceRecord, b: EvidenceRecord) {
  const p = (PRIORITY[b.status] ?? 0) - (PRIORITY[a.status] ?? 0);
  if (p) return p;
  const at = stampMillis(a.approvedAt) || createdAtMillis(a);
  const bt = stampMillis(b.approvedAt) || createdAtMillis(b);
  return bt - at;
}

export async function cleanupDuplicateEvidence(uid: string) {
  const items = await listUserEvidence(uid, { includeArchived: true });
  const groups = new Map<string, EvidenceRecord[]>();
  for (const item of items.filter((i) => i.status !== "archived")) {
    const key = duplicateKey(item);
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }
  const toArchive: EvidenceRecord[] = [];
  let duplicateGroups = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    duplicateGroups += 1;
    const ordered = [...group].sort(comparePreferred);
    toArchive.push(...ordered.slice(1));
  }
  if (!toArchive.length) return { archivedCount: 0, duplicateGroups };
  const batch = writeBatch(requireDb());
  for (const item of toArchive.slice(0,450)) {
    batch.update(doc(requireDb(), "evidence", item.id), {
      status: "archived", archiveReason: "duplicate_cleanup", archivedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();
  return { archivedCount: Math.min(toArchive.length, 450), duplicateGroups };
}

export async function getActiveFrameworkElements(): Promise<FrameworkElement[]> {
  try {
    const frameworks = query(collection(requireDb(), "frameworks"), where("status", "==", "active"), limit(1));
    const frameworkSnap = await getDocs(frameworks);
    const framework = frameworkSnap.docs[0];
    if (!framework) return OFFICIAL_TEACHER_FRAMEWORK_V2;
    const elementsSnap = await getDocs(query(collection(requireDb(), "frameworks", framework.id, "elements"), orderBy("order", "asc")));
    const elements = elementsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<FrameworkElement, "id">) }));
    return elements.length ? elements : OFFICIAL_TEACHER_FRAMEWORK_V2;
  } catch { return OFFICIAL_TEACHER_FRAMEWORK_V2; }
}
