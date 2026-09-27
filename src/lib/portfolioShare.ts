import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";
import type { ProfessionalProfile } from "@/types/athari";
import { normalizeProfessionalProfile } from "@/lib/professionalProfile";

export type ShareClassification = {
  elementId: string;
  elementName: string;
  isPrimary: boolean;
  requirementIds?: string[];
};

export type ShareAttachment = {
  originalFileName: string;
  mimeType: string;
  driveFileId?: string;
};

export type ShareEvidence = {
  id: string;
  title: string;
  description: string;
  impact: string;
  classifications: ShareClassification[];
  attachments: ShareAttachment[];
};

export type ShareDrivePermission = {
  driveFileId: string;
  permissionId: string;
  createdByAthari: boolean;
};

export type PortfolioShare = {
  id: string;
  ownerUid: string;
  ownerDisplayName: string;
  academicYear: string;
  active: boolean;
  evidence: ShareEvidence[];
  drivePermissions: ShareDrivePermission[];
  professionalProfile?: ProfessionalProfile;
};

function randomToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

function normalizeShare(id: string, value: unknown): PortfolioShare | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.ownerUid !== "string") return null;

  return {
    id,
    ownerUid: raw.ownerUid,
    ownerDisplayName:
      typeof raw.ownerDisplayName === "string"
        ? raw.ownerDisplayName
        : "صاحبة الملف",
    academicYear:
      typeof raw.academicYear === "string" ? raw.academicYear : "",
    active: raw.active === true,
    evidence: Array.isArray(raw.evidence)
      ? (raw.evidence as ShareEvidence[])
      : [],
    drivePermissions: Array.isArray(raw.drivePermissions)
      ? (raw.drivePermissions as ShareDrivePermission[])
      : [],
    professionalProfile:
      raw.professionalProfile && typeof raw.professionalProfile === "object"
        ? normalizeProfessionalProfile(raw.professionalProfile)
        : undefined,
  };
}

export async function getActivePortfolioShare(uid: string) {
  const userSnap = await getDoc(doc(requireDb(), "users", uid));
  if (!userSnap.exists()) return null;

  const shareId = userSnap.data().activePortfolioShareId;
  if (typeof shareId !== "string" || !shareId) return null;

  const shareSnap = await getDoc(doc(requireDb(), "publicShares", shareId));
  if (!shareSnap.exists()) return null;

  const share = normalizeShare(shareSnap.id, shareSnap.data());
  return share?.active ? share : null;
}

export async function createOrUpdatePortfolioShare(input: {
  uid: string;
  ownerDisplayName: string;
  academicYear: string;
  evidence: ShareEvidence[];
  drivePermissions: ShareDrivePermission[];
  professionalProfile?: ProfessionalProfile;
}) {
  const current = await getActivePortfolioShare(input.uid);
  const shareId = current?.id ?? randomToken();

  await setDoc(doc(requireDb(), "publicShares", shareId), {
    ownerUid: input.uid,
    ownerDisplayName: input.ownerDisplayName || "صاحبة الملف",
    academicYear: input.academicYear,
    active: true,
    evidence: input.evidence,
    drivePermissions: input.drivePermissions,
    ...(input.professionalProfile
      ? { professionalProfile: normalizeProfessionalProfile(input.professionalProfile) }
      : {}),
    updatedAt: serverTimestamp(),
    ...(current ? {} : { createdAt: serverTimestamp() }),
  });

  await setDoc(
    doc(requireDb(), "users", input.uid),
    {
      activePortfolioShareId: shareId,
      activePortfolioShareUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return { id: shareId };
}

export async function revokePortfolioShare(uid: string, shareId: string) {
  await updateDoc(doc(requireDb(), "publicShares", shareId), {
    active: false,
    revokedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await setDoc(
    doc(requireDb(), "users", uid),
    {
      activePortfolioShareId: deleteField(),
      activePortfolioShareUpdatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getPublicPortfolioShare(token: string) {
  if (!token) return null;
  const snap = await getDoc(doc(requireDb(), "publicShares", token));
  if (!snap.exists()) return null;
  const share = normalizeShare(snap.id, snap.data());
  return share?.active ? share : null;
}

export async function pruneActiveShare(uid: string, approvedIds: Set<string>) {
  const share = await getActivePortfolioShare(uid);
  if (!share) return { shareId: "", changed: false, dropped: [] as ShareDrivePermission[] };

  const evidence = share.evidence.filter((item) => approvedIds.has(item.id));
  if (evidence.length === share.evidence.length) {
    return { shareId: share.id, changed: false, dropped: [] as ShareDrivePermission[] };
  }

  const stillUsed = new Set(
    evidence.flatMap((item) =>
      item.attachments
        .map((attachment) => attachment.driveFileId)
        .filter((value): value is string => Boolean(value))
    )
  );

  await updateDoc(doc(requireDb(), "publicShares", share.id), {
    evidence,
    updatedAt: serverTimestamp(),
  });

  return {
    shareId: share.id,
    changed: true,
    dropped: share.drivePermissions.filter(
      (permission) => !stillUsed.has(permission.driveFileId)
    ),
  };
}

export async function forgetPermissions(
  shareId: string,
  revoked: ShareDrivePermission[]
) {
  if (!shareId || !revoked.length) return;
  const snap = await getDoc(doc(requireDb(), "publicShares", shareId));
  if (!snap.exists()) return;
  const current = normalizeShare(snap.id, snap.data());
  if (!current) return;
  const gone = new Set(revoked.map((entry) => `${entry.driveFileId}|${entry.permissionId}`));
  await updateDoc(doc(requireDb(), "publicShares", shareId), {
    drivePermissions: current.drivePermissions.filter(
      (entry) => !gone.has(`${entry.driveFileId}|${entry.permissionId}`)
    ),
    updatedAt: serverTimestamp(),
  });
}
