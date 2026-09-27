import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import type { ApprovedContent, EvidenceRecord } from "@/types/athari";

export async function approveEvidenceLinkedSafe(
  evidenceId: string,
  approvedContent: ApprovedContent,
  movedDriveParentFolderId?: string
) {
  const ref = doc(requireDb(), "evidence", evidenceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("EVIDENCE_NOT_FOUND");
  const current = snap.data() as EvidenceRecord;

  const attachments = current.attachments?.length
    ? current.attachments.map((attachment) =>
        attachment.sourceKind === "drive_link"
          ? attachment
          : {
              ...attachment,
              ...(movedDriveParentFolderId && attachment.driveFileId
                ? { driveParentFolderId: movedDriveParentFolderId }
                : {}),
            }
      )
    : undefined;

  const firstParent =
    movedDriveParentFolderId ||
    attachments?.find((attachment) => attachment.driveParentFolderId)?.driveParentFolderId ||
    current.driveParentFolderId;

  const update: Record<string, unknown> = {
    approvedContent,
    status: "approved",
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (firstParent) update.driveParentFolderId = firstParent;
  if (attachments) update.attachments = attachments;

  await updateDoc(ref, update);
}
