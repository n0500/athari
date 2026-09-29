import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import {
  ensureAthariElementFolder,
  ensureAthariInbox,
  uploadEvidenceToDrive,
} from "@/lib/drive";
import { computeFileHash, newAttachmentId } from "@/lib/firestore";
import type { EvidenceAttachment, EvidenceRecord } from "@/types/athari";

export const MAX_SUPPORTING_IMAGE_BYTES = 20 * 1024 * 1024;

const DRIVE_API = "https://www.googleapis.com/drive/v3";

export const MAX_REANALYSIS_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_REANALYSIS_SUPPORTING_IMAGES = 7;

/** Download the supporting images that are already linked to this evidence so
 * the teacher can explicitly ask Athari to re-read them. Nothing is analysed
 * automatically just because an attachment was added.
 */
export async function loadSupportingImagesForAnalysis(input: {
  token: string;
  attachments: EvidenceAttachment[];
}) {
  const images = input.attachments.filter(
    (attachment) => isSupportingImage(attachment) && isImageAttachment(attachment)
  );

  if (!images.length) throw new Error("NO_SUPPORTING_IMAGES");
  if (images.length > MAX_REANALYSIS_SUPPORTING_IMAGES) {
    throw new Error("TOO_MANY_SUPPORTING_IMAGES_FOR_ANALYSIS");
  }

  const oversized = images.find(
    (attachment) => attachment.fileSize > MAX_REANALYSIS_IMAGE_BYTES
  );
  if (oversized) {
    throw new Error(`SUPPORTING_IMAGE_TOO_LARGE_FOR_ANALYSIS:${oversized.originalFileName}`);
  }

  const files: File[] = [];
  for (const attachment of images) {
    if (!attachment.driveFileId) throw new Error("SUPPORTING_IMAGE_MISSING_DRIVE_FILE");
    const response = await fetch(
      `${DRIVE_API}/files/${encodeURIComponent(attachment.driveFileId)}?alt=media`,
      { headers: { Authorization: `Bearer ${input.token}` } }
    );

    if (response.status === 401) throw new Error("DRIVE_RECONNECT_REQUIRED");
    if (!response.ok) throw new Error(`DRIVE_ERROR_${response.status}`);

    const blob = await response.blob();
    files.push(
      new File([blob], attachment.originalFileName, {
        type: attachment.mimeType || blob.type || "image/jpeg",
      })
    );
  }

  return files;
}

export function evidenceAttachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;

  return [
    {
      attachmentId: newAttachmentId(),
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.contentHash ? { contentHash: item.contentHash } : {}),
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
      ...(item.driveParentFolderId ? { driveParentFolderId: item.driveParentFolderId } : {}),
    },
  ];
}

export function isImageAttachment(attachment: EvidenceAttachment) {
  const lower = attachment.originalFileName.toLowerCase();
  return attachment.mimeType.startsWith("image/") || /\.(jpe?g|png|webp|heic|heif)$/i.test(lower);
}

export function isSupportingImage(attachment: EvidenceAttachment) {
  return attachment.purpose === "supporting_image";
}

async function saveAttachments(evidenceId: string, attachments: EvidenceAttachment[]) {
  await updateDoc(doc(requireDb(), "evidence", evidenceId), {
    attachments,
    fileCount: attachments.length,
    updatedAt: serverTimestamp(),
  });
}

async function destinationFolder(token: string, item: EvidenceRecord) {
  if (item.status === "approved" && item.approvedContent?.elementName) {
    const { element } = await ensureAthariElementFolder(
      token,
      item.academicYear,
      item.approvedContent.elementName
    );
    return element.id;
  }

  const { inbox } = await ensureAthariInbox(token, item.academicYear);
  return inbox.id;
}

export async function addSupportingImages(input: {
  token: string;
  item: EvidenceRecord;
  files: File[];
}) {
  const imageFiles = input.files.filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) throw new Error("SUPPORTING_IMAGES_ONLY");

  const tooLarge = imageFiles.find((file) => file.size > MAX_SUPPORTING_IMAGE_BYTES);
  if (tooLarge) throw new Error(`SUPPORTING_IMAGE_TOO_LARGE:${tooLarge.name}`);

  const parentFolderId = await destinationFolder(input.token, input.item);
  let attachments: EvidenceAttachment[] = evidenceAttachmentsFor(input.item).map((attachment) => ({
    ...attachment,
    attachmentId: attachment.attachmentId || newAttachmentId(),
  }));

  const added: EvidenceAttachment[] = [];
  const skipped: string[] = [];

  for (const file of imageFiles) {
    const contentHash = await computeFileHash(file);
    const duplicate = attachments.some(
      (attachment) =>
        (attachment.contentHash && attachment.contentHash === contentHash) ||
        (!attachment.contentHash &&
          attachment.originalFileName === file.name &&
          attachment.fileSize === file.size)
    );

    if (duplicate) {
      skipped.push(file.name);
      continue;
    }

    const uploaded = await uploadEvidenceToDrive(input.token, file, parentFolderId);
    const attachment: EvidenceAttachment = {
      attachmentId: newAttachmentId(),
      originalFileName: file.name,
      mimeType: file.type || "image/jpeg",
      fileSize: file.size,
      contentHash,
      driveFileId: uploaded.id,
      ...(uploaded.webViewLink ? { driveWebViewLink: uploaded.webViewLink } : {}),
      driveParentFolderId: parentFolderId,
      sourceKind: "athari_upload",
      purpose: "supporting_image",
    };

    attachments = [...attachments, attachment];
    // Save after each successful upload so an interrupted batch does not lose
    // references to files that already reached Drive.
    await saveAttachments(input.item.id, attachments);
    added.push(attachment);
  }

  return { attachments, added, skipped };
}

export async function removeSupportingImage(input: {
  evidenceId: string;
  attachments: EvidenceAttachment[];
  attachmentId: string;
}) {
  const target = input.attachments.find(
    (attachment) => attachment.attachmentId === input.attachmentId
  );
  if (!target || !isSupportingImage(target)) {
    throw new Error("SUPPORTING_IMAGE_NOT_FOUND");
  }

  const attachments = input.attachments.filter(
    (attachment) => attachment.attachmentId !== input.attachmentId
  );
  await saveAttachments(input.evidenceId, attachments);
  return attachments;
}
