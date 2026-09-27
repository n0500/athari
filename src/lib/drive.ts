import { clearStoredDriveToken } from "@/lib/auth";
import type { ShareDrivePermission } from "@/lib/portfolioShare";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

export const GOOGLE_FOLDER_MIME = "application/vnd.google-apps.folder";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

export type DriveFile = {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  parents?: string[];
  webViewLink?: string;
};

function escapeQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function driveJson<T>(
  token: string,
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    clearStoredDriveToken();
    throw new Error("DRIVE_RECONNECT_REQUIRED");
  }

  if (!response.ok) throw new Error(`DRIVE_ERROR_${response.status}`);
  return response.json() as Promise<T>;
}

async function findFolder(
  token: string,
  name: string,
  parentId: string
): Promise<DriveFile | null> {
  const q = [
    `name = '${escapeQuery(name)}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `'${escapeQuery(parentId)}' in parents`,
  ].join(" and ");

  const result = await driveJson<{ files: DriveFile[] }>(
    token,
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,parents)&pageSize=10`
  );

  return result.files[0] ?? null;
}

async function createFolder(
  token: string,
  name: string,
  parentId: string
): Promise<DriveFile> {
  return driveJson<DriveFile>(
    token,
    `${DRIVE_API}/files?fields=id,name,mimeType,parents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: GOOGLE_FOLDER_MIME,
        parents: [parentId],
      }),
    }
  );
}

export async function ensureFolder(
  token: string,
  name: string,
  parentId: string
) {
  return (
    (await findFolder(token, name, parentId)) ??
    (await createFolder(token, name, parentId))
  );
}

export async function ensureAthariInbox(
  token: string,
  academicYear: string
) {
  const root = await ensureFolder(token, "أثري", "root");
  const year = await ensureFolder(token, academicYear, root.id);
  const inbox = await ensureFolder(token, "00 - قيد المراجعة", year.id);
  return { root, year, inbox };
}

export async function ensureAthariElementFolder(
  token: string,
  academicYear: string,
  elementName: string
) {
  const root = await ensureFolder(token, "أثري", "root");
  const year = await ensureFolder(token, academicYear, root.id);
  const element = await ensureFolder(token, elementName, year.id);
  return { root, year, element };
}

export async function uploadEvidenceToDrive(
  token: string,
  file: File,
  parentFolderId: string
): Promise<DriveFile> {
  const boundary = `athari_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: file.name,
    parents: [parentFolderId],
  });

  const body = new Blob(
    [
      `--${boundary}\r\n`,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      metadata,
      `\r\n--${boundary}\r\n`,
      `Content-Type: ${file.type || "application/octet-stream"}\r\n\r\n`,
      file,
      `\r\n--${boundary}--`,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  return driveJson<DriveFile>(
    token,
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,mimeType,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
}

export async function getDriveFile(
  token: string,
  fileId: string
): Promise<DriveFile> {
  return driveJson<DriveFile>(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,parents,webViewLink`
  );
}

export function driveItemIsSupported(item: DriveFile) {
  const mime = item.mimeType || "";
  return [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    GOOGLE_DOC,
    GOOGLE_SHEET,
    GOOGLE_SLIDES,
  ].includes(mime);
}

export async function listDriveFolderFiles(token: string, folderId: string) {
  const q = [`'${escapeQuery(folderId)}' in parents`, "trashed = false"].join(" and ");
  const result = await driveJson<{ files: DriveFile[] }>(
    token,
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,parents,webViewLink)&orderBy=name&pageSize=100`
  );
  return result.files.filter((item) => item.mimeType !== GOOGLE_FOLDER_MIME);
}

function exportedName(name: string) {
  return /\.pdf$/i.test(name) ? name : `${name}.pdf`;
}

export async function downloadDriveFileForAnalysis(token: string, item: DriveFile) {
  const mime = item.mimeType || "application/octet-stream";
  const isGoogleNative = [GOOGLE_DOC, GOOGLE_SHEET, GOOGLE_SLIDES].includes(mime);
  const url = isGoogleNative
    ? `${DRIVE_API}/files/${encodeURIComponent(item.id)}/export?mimeType=${encodeURIComponent("application/pdf")}`
    : `${DRIVE_API}/files/${encodeURIComponent(item.id)}?alt=media`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (response.status === 401) {
    clearStoredDriveToken();
    throw new Error("DRIVE_RECONNECT_REQUIRED");
  }
  if (!response.ok) throw new Error(`DRIVE_DOWNLOAD_${response.status}`);

  const blob = await response.blob();
  const fileMime = isGoogleNative ? "application/pdf" : mime;
  const name = isGoogleNative ? exportedName(item.name) : item.name;
  return new File([blob], name, { type: fileMime });
}

export async function moveDriveFile(
  token: string,
  fileId: string,
  _fromParentId: string | undefined,
  toParentId: string
) {
  const current = await getDriveFile(token, fileId);
  const currentParents = current.parents ?? [];

  if (currentParents.includes(toParentId)) return current;

  const params = new URLSearchParams({
    addParents: toParentId,
    fields: "id,name,mimeType,parents,webViewLink",
  });

  if (currentParents.length) {
    params.set("removeParents", currentParents.join(","));
  }

  return driveJson<DriveFile>(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`,
    { method: "PATCH" }
  );
}

async function listPermissions(token: string, fileId: string) {
  return driveJson<{
    permissions: Array<{ id: string; type: string; role: string }>;
  }>(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions?fields=permissions(id,type,role)`
  );
}

async function createAnyoneReader(token: string, fileId: string) {
  return driveJson<{ id: string }>(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}/permissions?fields=id`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "anyone",
        role: "reader",
        allowFileDiscovery: false,
      }),
    }
  );
}

export async function publishPortfolioFiles(
  token: string,
  fileIds: string[],
  previous: ShareDrivePermission[] = []
) {
  const uniqueIds = [...new Set(fileIds.filter(Boolean))];
  const published: ShareDrivePermission[] = [];
  const createdNow: ShareDrivePermission[] = [];

  try {
    for (const driveFileId of uniqueIds) {
      const current = await listPermissions(token, driveFileId);
      const anyoneReader = current.permissions.find(
        (permission) =>
          permission.type === "anyone" && permission.role === "reader"
      );

      if (anyoneReader) {
        const prior = previous.find(
          (entry) =>
            entry.driveFileId === driveFileId &&
            entry.permissionId === anyoneReader.id
        );

        published.push({
          driveFileId,
          permissionId: anyoneReader.id,
          createdByAthari: prior?.createdByAthari ?? false,
        });
        continue;
      }

      const created = await createAnyoneReader(token, driveFileId);
      const entry: ShareDrivePermission = {
        driveFileId,
        permissionId: created.id,
        createdByAthari: true,
      };
      published.push(entry);
      createdNow.push(entry);
    }
  } catch (error) {
    await revokePortfolioPermissions(token, createdNow).catch(() => undefined);
    throw error;
  }

  return published;
}

export function newlyAddedPermissions(
  published: ShareDrivePermission[],
  previous: ShareDrivePermission[]
) {
  return published.filter(
    (entry) =>
      entry.createdByAthari &&
      !previous.some(
        (prior) =>
          prior.driveFileId === entry.driveFileId &&
          prior.permissionId === entry.permissionId
      )
  );
}

export async function revokePortfolioPermissions(
  token: string,
  permissions: ShareDrivePermission[]
) {
  for (const permission of permissions) {
    if (!permission.createdByAthari) continue;

    const response = await fetch(
      `${DRIVE_API}/files/${encodeURIComponent(
        permission.driveFileId
      )}/permissions/${encodeURIComponent(permission.permissionId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (response.status === 401) {
      clearStoredDriveToken();
      throw new Error("DRIVE_RECONNECT_REQUIRED");
    }

    if (!response.ok && response.status !== 404) {
      throw new Error(`DRIVE_ERROR_${response.status}`);
    }
  }
}

async function findBackup(token: string) {
  const q = "name = 'athari-backup.json' and trashed = false";
  const result = await driveJson<{ files: DriveFile[] }>(
    token,
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=10`
  );
  return result.files[0] ?? null;
}

export async function upsertAthariBackup(
  token: string,
  payload: unknown
) {
  const root = await ensureFolder(token, "أثري", "root");
  const backup = await findBackup(token);
  const json = JSON.stringify(payload, null, 2);

  if (backup) {
    const response = await fetch(
      `${DRIVE_UPLOAD}/files/${backup.id}?uploadType=media`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: json,
      }
    );

    if (response.status === 401) {
      clearStoredDriveToken();
      throw new Error("DRIVE_RECONNECT_REQUIRED");
    }

    if (!response.ok) throw new Error("DRIVE_BACKUP_UPDATE_FAILED");
    return backup.id;
  }

  const file = new File([json], "athari-backup.json", {
    type: "application/json",
  });
  const created = await uploadEvidenceToDrive(token, file, root.id);
  return created.id;
}
