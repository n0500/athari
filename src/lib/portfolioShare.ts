import {
  deleteField,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { requireDb } from "@/lib/firebase";

export type ShareClassification = {
  elementId: string;
  elementName: string;
  isPrimary: boolean;
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
