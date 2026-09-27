import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import type { DriveSourceLink } from "@/types/athari";

export async function saveEvidenceDriveSource(
  evidenceId: string,
  source: DriveSourceLink
) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    driveSource: source,
    updatedAt: serverTimestamp(),
  });
}
