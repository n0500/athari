import { getStoredDriveToken } from "@/lib/auth";
import {
  newlyAddedPermissions,
  publishPortfolioFiles,
  revokePortfolioPermissions,
} from "@/lib/drive";
import { listUserEvidence } from "@/lib/firestore";
import { getProfessionalProfile } from "@/lib/professionalProfile";
import { getProfessionalDocuments, orderedDocuments } from "@/lib/professionalDocuments";
import {
  createOrUpdatePortfolioShare,
  forgetPermissions,
  getActivePortfolioShare,
} from "@/lib/portfolioShare";
import type { ShareDrivePermission, ShareEvidence } from "@/lib/portfolioShare";
import type {
  ApprovedClassification,
  EvidenceAttachment,
  EvidenceRecord,
} from "@/types/athari";

export function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];

  if (approved.classifications?.length) {
    return approved.classifications.slice(0, 3);
  }

  if (approved.elementId && approved.elementName) {
    return [
      {
        elementId: approved.elementId,
        elementName: approved.elementName,
        isPrimary: true,
        requirementIds: [],
      },
    ];
  }

  return [];
}

export function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
    },
  ];
}

export function shareEvidenceFor(items: EvidenceRecord[]): ShareEvidence[] {
  return items.map((item) => ({
    id: item.id,
    title: item.approvedContent?.title || item.originalFileName,
    description: item.approvedContent?.description || "",
    impact: item.approvedContent?.impact || "",
    highlight: item.approvedContent?.highlight || "",
    classifications: classificationsFor(item).map((classification) => ({
      elementId: classification.elementId,
      elementName: classification.elementName,
      isPrimary: classification.isPrimary,
      requirementIds: classification.requirementIds ?? [],
    })),
    attachments: attachmentsFor(item).map((attachment) => ({
      originalFileName: attachment.originalFileName,
      mimeType: attachment.mimeType,
      ...(attachment.driveFileId ? { driveFileId: attachment.driveFileId } : {}),
    })),
  }));
}

export type ShareRefreshStatus =
  /** No active share: nothing to keep in step. */
  | "no_share"
  /** The principal's link shows the current portfolio. */
  | "updated"
  /** New files need Google Drive access; the link was left as it was. */
  | "needs_drive";

export type ShareRefreshResult = {
  status: ShareRefreshStatus;
  shareId?: string;
  /** Drive access still to be withdrawn from files no longer shared. */
  revokePending?: boolean;
};

/**
 * Rebuilds the principal's shared copy from the current approved evidence,
 * professional identity and professional documents.
 *
 * - Without `create`, it only updates an existing active share.
 * - Files already shared keep their access; only new files are published
 *   (all files are re-checked when `fullCheck` is set, e.g. the manual button).
 * - A token is needed only for new files or to withdraw access. Without one,
 *   access to removed files stays recorded and is withdrawn on a later update.
 */
export async function refreshPortfolioShare(
  uid: string,
  options: {
    token?: string | null;
    create?: boolean;
    fullCheck?: boolean;
    fallbackName?: string;
  } = {}
): Promise<ShareRefreshResult> {
  const current = await getActivePortfolioShare(uid);
  if (!current && !options.create) return { status: "no_share" };

  // Read everything first. A failed read must never drop content from the link.
  const [all, profile, documents] = await Promise.all([
    listUserEvidence(uid),
    getProfessionalProfile(uid).catch(() => null),
    getProfessionalDocuments(uid).then(orderedDocuments),
  ]);

  const approved: EvidenceRecord[] = all.filter((item) => item.status === "approved");
  const evidence = shareEvidenceFor(approved);
  const fileIds: string[] = [
    ...new Set<string>(
      approved
        .flatMap((item) => attachmentsFor(item).map((attachment) => attachment.driveFileId))
        .concat(documents.map((entry: { driveFileId: string }) => entry.driveFileId))
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const wanted = new Set(fileIds);

  const previous: ShareDrivePermission[] = current?.drivePermissions ?? [];
  const alreadyShared = new Set(previous.map((entry) => entry.driveFileId));
  const toPublish = options.fullCheck ? fileIds : fileIds.filter((id) => !alreadyShared.has(id));

  const token = options.token ?? getStoredDriveToken();
  if (toPublish.length && !token) return { status: "needs_drive", shareId: current?.id };

  const published = toPublish.length ? await publishPortfolioFiles(token!, toPublish, previous) : [];
  const publishedIds = new Set(published.map((entry) => entry.driveFileId));
  const kept = previous.filter(
    (entry) => wanted.has(entry.driveFileId) && !publishedIds.has(entry.driveFileId)
  );
  const removed = previous.filter((entry) => !wanted.has(entry.driveFileId));

  let share: { id: string };
  try {
    share = await createOrUpdatePortfolioShare({
      uid,
      ownerDisplayName:
        profile?.fullName || options.fallbackName || current?.ownerDisplayName || "صاحبة الملف",
      academicYear: process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ",
      evidence,
      drivePermissions: [...kept, ...published, ...removed],
      ...(profile ? { professionalProfile: profile } : {}),
      documents: documents.map((entry) => ({
        kind: entry.kind,
        label: entry.label,
        originalFileName: entry.originalFileName,
        mimeType: entry.mimeType,
        driveFileId: entry.driveFileId,
      })),
    });
  } catch (error) {
    if (token) {
      await revokePortfolioPermissions(token, newlyAddedPermissions(published, previous)).catch(
        () => undefined
      );
    }
    throw error;
  }

  let revokePending = false;
  if (removed.length) {
    if (token) {
      try {
        await revokePortfolioPermissions(token, removed);
        await forgetPermissions(share.id, removed);
      } catch {
        revokePending = true; // Still recorded on the share; the next update retries.
      }
    } else {
      revokePending = true;
    }
  }

  return { status: "updated", shareId: share.id, revokePending };
}

/** Formal Arabic note for a refresh that could not reach the principal's link. */
export const SHARE_NEEDS_UPDATE_MESSAGE =
  "لم تُحدَّث مشاركة ملف الأداء تلقائيًا هذه المرة. افتحي «مشاركة ملف الأداء» واضغطي «تحديث المشاركة».";

/**
 * Keeps the principal's link in step after a change, without ever blocking
 * the change itself. Returns a note to show only when something is left to do.
 */
export async function autoRefreshShare(uid: string, token?: string | null): Promise<string> {
  try {
    const result = await refreshPortfolioShare(uid, { token });
    return result.status === "needs_drive" ? SHARE_NEEDS_UPDATE_MESSAGE : "";
  } catch {
    return SHARE_NEEDS_UPDATE_MESSAGE;
  }
}
