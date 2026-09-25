import {
  addDoc,
  collection,
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
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import {
  AiAnalysis,
  ApprovedContent,
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

export async function createEvidenceDraft(input: {
  ownerUid: string;
  academicYear: string;
  file: File;
}) {
  const ref = await addDoc(collection(requireDb(), "evidence"), {
    ownerUid: input.ownerUid,
    academicYear: input.academicYear,
    status: "uploading",
    originalFileName: input.file.name,
    mimeType: input.file.type || "application/octet-stream",
    fileSize: input.file.size,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function attachDriveFile(
  evidenceId: string,
  data: {
    driveFileId: string;
    driveWebViewLink?: string;
    driveParentFolderId: string;
  }
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    ...data,
    status: "uploaded",
    updatedAt: serverTimestamp(),
  });
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
    status: analysis.missingInformation
      ? "needs_info"
      : "ready_for_review",
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
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    approvedContent,
    driveParentFolderId: newDriveParentFolderId,
    status: "approved",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function listUserEvidence(uid: string) {
  const q = query(
    collection(requireDb(), "evidence"),
    where("ownerUid", "==", uid),
    orderBy("createdAt", "desc"),
    limit(250)
  );
  const snaps = await getDocs(q);
  return snaps.docs.map(
    (d) => ({ id: d.id, ...d.data() }) as EvidenceRecord
  );
}

export async function getActiveFrameworkElements(): Promise<FrameworkElement[]> {
  const frameworks = query(
    collection(requireDb(), "frameworks"),
    where("status", "==", "active"),
    limit(1)
  );
  const frameworkSnap = await getDocs(frameworks);
  const framework = frameworkSnap.docs[0];
  if (!framework) return [];

  const elementsSnap = await getDocs(
    query(
      collection(
        requireDb(),
        "frameworks",
        framework.id,
        "elements"
      ),
      orderBy("order", "asc")
    )
  );

  return elementsSnap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<FrameworkElement, "id">),
  }));
}
