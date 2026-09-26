import { clearStoredDriveToken } from "@/lib/auth";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3";

type DriveFile = {
  id: string;
  name: string;
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
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,parents)&pageSize=10`
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
    `${DRIVE_API}/files?fields=id,name,parents`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        mimeType: "application/vnd.google-apps.folder",
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
  const inbox = await ensureFolder(
    token,
    "00 - قيد المراجعة",
    year.id
  );
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
    `${DRIVE_UPLOAD}/files?uploadType=multipart&fields=id,name,parents,webViewLink`,
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
}

export async function moveDriveFile(
  token: string,
  fileId: string,
  fromParentId: string | undefined,
  toParentId: string
) {
  const params = new URLSearchParams({
    addParents: toParentId,
    fields: "id,name,parents,webViewLink",
  });

  if (fromParentId) params.set("removeParents", fromParentId);

  return driveJson<DriveFile>(
    token,
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`,
    { method: "PATCH" }
  );
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
