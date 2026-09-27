import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { requireDb } from "@/lib/firebase";

export type LinkedDriveFolder = {
  id: string;
  name: string;
  webViewLink?: string;
  addedAt?: string;
  lastCheckedAt?: string;
};

function normalizeFolder(value: unknown): LinkedDriveFolder | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!id || !name) return null;
  return {
    id,
    name,
    ...(typeof raw.webViewLink === "string" && raw.webViewLink
      ? { webViewLink: raw.webViewLink }
      : {}),
    ...(typeof raw.addedAt === "string" && raw.addedAt
      ? { addedAt: raw.addedAt }
      : {}),
    ...(typeof raw.lastCheckedAt === "string" && raw.lastCheckedAt
      ? { lastCheckedAt: raw.lastCheckedAt }
      : {}),
  };
}

export async function getLinkedDriveFolders(uid: string) {
  const snap = await getDoc(doc(requireDb(), "users", uid));
  if (!snap.exists()) return [] as LinkedDriveFolder[];
  const raw = snap.data().linkedDriveFolders;
  return Array.isArray(raw)
    ? raw.map(normalizeFolder).filter((item): item is LinkedDriveFolder => Boolean(item))
    : [];
}

async function saveFolders(uid: string, folders: LinkedDriveFolder[]) {
  await setDoc(
    doc(requireDb(), "users", uid),
    {
      linkedDriveFolders: folders.slice(0, 20),
      linkedDriveFoldersUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function upsertLinkedDriveFolder(
  uid: string,
  folder: LinkedDriveFolder
) {
  const current = await getLinkedDriveFolders(uid);
  const now = new Date().toISOString();
  const existing = current.find((item) => item.id === folder.id);
  const next: LinkedDriveFolder = {
    ...existing,
    ...folder,
    addedAt: existing?.addedAt || folder.addedAt || now,
  };
  const merged = [next, ...current.filter((item) => item.id !== folder.id)];
  await saveFolders(uid, merged);
  return merged;
}

export async function touchLinkedDriveFolder(uid: string, folderId: string) {
  const current = await getLinkedDriveFolders(uid);
  const now = new Date().toISOString();
  const next = current.map((item) =>
    item.id === folderId ? { ...item, lastCheckedAt: now } : item
  );
  await saveFolders(uid, next);
  return next;
}

export async function removeLinkedDriveFolder(uid: string, folderId: string) {
  const current = await getLinkedDriveFolders(uid);
  const next = current.filter((item) => item.id !== folderId);
  await saveFolders(uid, next);
  return next;
}
