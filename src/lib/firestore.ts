import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import {
  AiAnalysis,
  ApprovedContent,
  EvidenceAttachment,
  EvidenceRecord,
  FrameworkElement,
} from "@/types/athari";

export async function ensureUserProfile(
  uid: string,
  data: { displayName?: string | null; email?: string | null }
) {
  await setDoc(
    doc(requireDb(), "users", uid),
    {
      displayName: data.displayName ?? "",
      email: data.email ?? "",
      role: "teacher",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function computeFileHash(file: File) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const computeEvidenceHash = computeFileHash;

export async function computeEvidenceBundleHash(files: File[]) {
  const fileHashes = await Promise.all(files.map(computeFileHash));
  const signature = [...fileHashes].sort().join("|");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(signature)
  );
  const contentHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return { contentHash, fileHashes };
}

export async function createEvidenceDraft(input: {
  ownerUid: string;
  academicYear: string;
  files?: File[];
  file?: File;
  contentHash?: string;
  fileHashes?: string[];
}) {
  const files = input.files?.length ? input.files : input.file ? [input.file] : [];
  const hashes = input.fileHashes ?? [];
  const first = files[0];
  if (!first) throw new Error("FILE_REQUIRED");

  const attachments: EvidenceAttachment[] = files.map((file, index) => ({
    originalFileName: file.name,
    mimeType: file.type || "application/octet-stream",
    fileSize: file.size,
    ...(hashes[index] ? { contentHash: hashes[index] } : {}),
  }));

  const ref = await addDoc(collection(requireDb(), "evidence"), {
    ownerUid: input.ownerUid,
    academicYear: input.academicYear,
    status: "uploading",
    originalFileName: first.name,
    mimeType: first.type || "application/octet-stream",
    fileSize: first.size,
    fileCount: files.length,
    ...(input.contentHash ? { contentHash: input.contentHash } : {}),
    attachments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}

export async function setEvidenceContentHash(
  evidenceId: string,
  contentHash: string
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    contentHash,
    updatedAt: serverTimestamp(),
  });
}

export async function attachDriveFiles(
  evidenceId: string,
  attachments: EvidenceAttachment[]
) {
  const first = attachments[0];
  if (!first) throw new Error("FILE_REQUIRED");

  const update: Record<string, unknown> = {
    attachments,
    fileCount: attachments.length,
    originalFileName: first.originalFileName,
    mimeType: first.mimeType,
    fileSize: first.fileSize,
    status: "uploaded",
    updatedAt: serverTimestamp(),
  };

  if (first.driveFileId) update.driveFileId = first.driveFileId;
  if (first.driveWebViewLink) update.driveWebViewLink = first.driveWebViewLink;
  if (first.driveParentFolderId) {
    update.driveParentFolderId = first.driveParentFolderId;
  }

  await updateDoc(doc(requireDb(), "evidence", evidenceId), update);
}


export async function attachDriveFile(
  evidenceId: string,
  data: {
    driveFileId: string;
    driveWebViewLink?: string;
    driveParentFolderId: string;
  }
) {
  const current = await getEvidence(evidenceId);
  if (!current) throw new Error("EVIDENCE_NOT_FOUND");

  const attachment: EvidenceAttachment = {
    originalFileName: current.originalFileName,
    mimeType: current.mimeType,
    fileSize: current.fileSize,
    ...(current.contentHash ? { contentHash: current.contentHash } : {}),
    driveFileId: data.driveFileId,
    ...(data.driveWebViewLink
      ? { driveWebViewLink: data.driveWebViewLink }
      : {}),
    driveParentFolderId: data.driveParentFolderId,
  };

  await attachDriveFiles(evidenceId, [attachment]);
}

export async function markAnalyzing(evidenceId: string) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    status: "analyzing",
    updatedAt: serverTimestamp(),
  });
}

export async function saveAnalysis(
  evidenceId: string,
  analysis: AiAnalysis
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    aiAnalysis: analysis,
    status: analysis.missingInformation ? "needs_info" : "ready_for_review",
    updatedAt: serverTimestamp(),
  });
}

export async function markAnalysisFailed(
  evidenceId: string,
  message: string
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    status: "analysis_failed",
    analysisError: message.slice(0, 500),
    updatedAt: serverTimestamp(),
  });
}

export async function getEvidence(
  evidenceId: string
): Promise<EvidenceRecord | null> {
  const snap = await getDoc(doc(requireDb(), "evidence", evidenceId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as EvidenceRecord;
}

export async function approveEvidence(
  evidenceId: string,
  approvedContent: ApprovedContent,
  newDriveParentFolderId: string
) {
  const ref = doc(requireDb(), "evidence", evidenceId);
  const snap = await getDoc(ref);
  const current = snap.exists() ? (snap.data() as EvidenceRecord) : null;
  const attachments = current?.attachments?.length
    ? current.attachments.map((attachment) => ({
        ...attachment,
        driveParentFolderId: attachment.driveFileId
          ? newDriveParentFolderId
          : attachment.driveParentFolderId,
      }))
    : undefined;

  const update: Record<string, unknown> = {
    approvedContent,
    driveParentFolderId: newDriveParentFolderId,
    status: "approved",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (attachments) update.attachments = attachments;

  await updateDoc(ref, update);
}

function stampMillis(value: unknown) {
  const stamp = value as
    | { toMillis?: () => number; seconds?: number }
    | undefined;
  if (typeof stamp?.toMillis === "function") return stamp.toMillis();
  if (typeof stamp?.seconds === "number") return stamp.seconds * 1000;
  return 0;
}

function createdAtMillis(record: EvidenceRecord) {
  return stampMillis(record.createdAt);
}

export async function listUserEvidence(
  uid: string,
  options?: { includeArchived?: boolean }
) {
  const q = query(
    collection(requireDb(), "evidence"),
    where("ownerUid", "==", uid),
    limit(250)
  );
  const snaps = await getDocs(q);

  return snaps.docs
    .map((d) => ({ id: d.id, ...d.data() }) as EvidenceRecord)
    .filter((item) => options?.includeArchived || item.status !== "archived")
    .sort((a, b) => createdAtMillis(b) - createdAtMillis(a));
}

export async function findDuplicateEvidence(input: {
  uid: string;
  academicYear: string;
  files?: File[];
  file?: File;
  contentHash: string;
}) {
  const files = input.files?.length ? input.files : input.file ? [input.file] : [];
  const items = await listUserEvidence(input.uid);

  const exact = items.find(
    (item) =>
      item.academicYear === input.academicYear &&
      item.contentHash === input.contentHash
  );
  if (exact) return exact;

  if (files.length === 1) {
    const file = files[0];
    return (
      items.find(
        (item) =>
          item.academicYear === input.academicYear &&
          !item.contentHash &&
          item.originalFileName === file.name &&
          item.fileSize === file.size
      ) ?? null
    );
  }

  return null;
}

export async function archiveEvidence(
  evidenceId: string,
  reason = "manual_archive"
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    status: "archived",
    archiveReason: reason,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEvidenceRecord(evidenceId: string) {
  await deleteDoc(doc(requireDb(), "evidence", evidenceId));
}

const PRIORITY: Record<string, number> = {
  approved: 100,
  ready_for_review: 80,
  needs_info: 75,
  analyzing: 50,
  uploaded: 45,
  uploading: 40,
  analysis_failed: 10,
  draft: 5,
};

function duplicateKey(item: EvidenceRecord) {
  const year = item.academicYear || "";
  return item.contentHash
    ? `${year}|hash:${item.contentHash}`
    : `${year}|legacy:${item.originalFileName}|${item.fileSize}`;
}

function comparePreferred(a: EvidenceRecord, b: EvidenceRecord) {
  const priority = (PRIORITY[b.status] ?? 0) - (PRIORITY[a.status] ?? 0);
  if (priority) return priority;
  const aTime = stampMillis(a.approvedAt) || createdAtMillis(a);
  const bTime = stampMillis(b.approvedAt) || createdAtMillis(b);
  return bTime - aTime;
}

export async function cleanupDuplicateEvidence(uid: string) {
  const items = await listUserEvidence(uid, { includeArchived: true });
  const groups = new Map<string, EvidenceRecord[]>();

  for (const item of items.filter((entry) => entry.status !== "archived")) {
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

  if (!toArchive.length) {
    return { archivedCount: 0, duplicateGroups };
  }

  const batch = writeBatch(requireDb());
  for (const item of toArchive.slice(0, 450)) {
    batch.update(doc(requireDb(), "evidence", item.id), {
      status: "archived",
      archiveReason: "duplicate_cleanup",
      archivedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }
  await batch.commit();

  return {
    archivedCount: Math.min(toArchive.length, 450),
    duplicateGroups,
  };
}

export async function getActiveFrameworkElements(): Promise<FrameworkElement[]> {
  try {
    const frameworks = query(
      collection(requireDb(), "frameworks"),
      where("status", "==", "active"),
      limit(1)
    );
    const frameworkSnap = await getDocs(frameworks);
    const framework = frameworkSnap.docs[0];
    if (!framework) return OFFICIAL_TEACHER_FRAMEWORK_V2;

    const elementsSnap = await getDocs(
      query(
        collection(requireDb(), "frameworks", framework.id, "elements"),
        orderBy("order", "asc")
      )
    );
    const elements = elementsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<FrameworkElement, "id">),
    }));
    return elements.length ? elements : OFFICIAL_TEACHER_FRAMEWORK_V2;
  } catch {
    return OFFICIAL_TEACHER_FRAMEWORK_V2;
  }
}
