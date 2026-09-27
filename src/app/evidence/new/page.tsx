"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  AthShell,
  ElementArt,
  Glyph,
  Notice,
  Panel,
} from "@/components/athari-ui/Ui";
import { Scene } from "@/components/athari-ui/Art";
import { requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import {
  downloadDriveFileForAnalysis,
  driveItemIsSupported,
  ensureAthariInbox,
  getDriveFile,
  uploadEvidenceToDrive,
  type DriveFile,
} from "@/lib/drive";
import { pickDriveFiles, pickDriveFolder } from "@/lib/drivePicker";
import { saveEvidenceDriveSource } from "@/lib/driveSource";
import {
  getLinkedDriveFolders,
  removeLinkedDriveFolder,
  touchLinkedDriveFolder,
  upsertLinkedDriveFolder,
  type LinkedDriveFolder,
} from "@/lib/linkedDriveFolders";
import {
  attachDriveFiles,
  computeEvidenceBundleHash,
  createEvidenceDraft,
  findDuplicateEvidence,
  getActiveFrameworkElements,
  listUserEvidence,
  markAnalyzing,
  markAnalysisFailed,
  matchPriorAttachments,
  newAttachmentId,
  saveAnalysis,
  saveAttachmentProgress,
  setEvidenceContentHash,
} from "@/lib/firestore";
import { analyzeEvidence } from "@/lib/ai";
import { requirementsForElement } from "@/data/mandatory-requirements";
import { DriveSourceLink, EvidenceAttachment } from "@/types/athari";
import { InfoTip } from "@/components/InfoTip";

const MAX_FILES = 8;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_BYTES = 30 * 1024 * 1024;
const ACCEPTED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

type SourceMode = "standard" | "folder_batch";

function isAccepted(file: File) {
  if (file.type && ACCEPTED.includes(file.type)) return true;
  return /\.(pdf|jpe?g|png|webp|docx)$/i.test(file.name);
}

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function legacyAttachmentFromRecord(record: {
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  contentHash?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
}): EvidenceAttachment | null {
  if (!record.driveFileId) return null;
  return {
    originalFileName: record.originalFileName,
    mimeType: record.mimeType,
    fileSize: record.fileSize,
    ...(record.contentHash ? { contentHash: record.contentHash } : {}),
    driveFileId: record.driveFileId,
    ...(record.driveWebViewLink
      ? { driveWebViewLink: record.driveWebViewLink }
      : {}),
    ...(record.driveParentFolderId
      ? { driveParentFolderId: record.driveParentFolderId }
      : {}),
  };
}

function driveErrorMessage(raw: string) {
  if (raw === "PICKER_NOT_CONFIGURED" || raw === "PICKER_UNAVAILABLE") {
    return "تعذر فتح اختيار Google Drive. تحققي من إعداد Google Picker ثم أعيدي المحاولة.";
  }
  if (raw === "PICKER_FOLDER_REQUIRED") {
    return "اختاري مجلدًا من Google Drive.";
  }
  if (raw === "DRIVE_RECONNECT_REQUIRED") {
    return "يرجى تسجيل الدخول إلى Google ثم إعادة المحاولة.";
  }
  return raw.startsWith("DRIVE_")
    ? "تعذر قراءة الملف أو المجلد من Google Drive."
    : raw;
}

export default function NewEvidencePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [linkedDriveItems, setLinkedDriveItems] = useState<DriveFile[]>([]);
  const [linkedSource, setLinkedSource] = useState<DriveSourceLink | null>(null);
  const [linkedFolders, setLinkedFolders] = useState<LinkedDriveFolder[]>([]);
  const [sourceMode, setSourceMode] = useState<SourceMode>("standard");
  const [sourceLabel, setSourceLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const academicYear =
    process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  const isDriveLinked = linkedDriveItems.length > 0;
  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setLinkedFolders([]);
        return;
      }
      try {
        setLinkedFolders(await getLinkedDriveFolders(user.uid));
      } catch {
        // Folder shortcuts are a convenience; evidence upload still works without them.
      }
    });
  }, []);

  function resetMessages() {
    setMessage("");
    setIsError(false);
  }

  function clearSelection() {
    setFiles([]);
    setLinkedDriveItems([]);
    setLinkedSource(null);
    setSourceLabel("");
    setSourceMode("standard");
  }

  function validateFiles(selected: File[]) {
    if (selected.length > MAX_FILES) {
      throw new Error(`الحد الأعلى ${MAX_FILES} ملفات في العملية الواحدة.`);
    }
    const oversized = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) throw new Error(`الملف «${oversized.name}» أكبر من 10 MB.`);
    const unsupported = selected.find((file) => !isAccepted(file));
    if (unsupported) {
      throw new Error("الصيغ المدعومة: PDF، وصور JPG/PNG/WebP، وملفات Word DOCX.");
    }
    const total = selected.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      throw new Error("إجمالي الملفات في العملية الواحدة يجب ألا يتجاوز 30 MB.");
    }
  }

  function chooseFiles(list: FileList | null) {
    resetMessages();
    const selected = Array.from(list ?? []);
    if (!selected.length) {
      clearSelection();
      return;
    }

    const unique = selected.filter(
      (file, index, all) =>
        all.findIndex(
          (candidate) =>
            candidate.name === file.name &&
            candidate.size === file.size &&
            candidate.lastModified === file.lastModified
        ) === index
    );

    try {
      validateFiles(unique);
      setFiles(unique);
      setLinkedDriveItems([]);
      setLinkedSource(null);
      setSourceLabel("من الجهاز");
      setSourceMode("standard");
    } catch (error) {
      clearSelection();
      setMessage(error instanceof Error ? error.message : "تعذر اختيار الملفات.");
      setIsError(true);
    }
  }

  async function downloadPickedItems(token: string, picked: Array<{ id: string }>) {
    if (picked.length > MAX_FILES) {
      throw new Error(`اختاري حتى ${MAX_FILES} ملفات في كل مرة.`);
    }
    const items: DriveFile[] = [];
    const downloaded: File[] = [];
    for (const pickedItem of picked) {
      const item = await getDriveFile(token, pickedItem.id);
      if (!driveItemIsSupported(item)) {
        throw new Error(`الملف «${item.name}» من نوع غير مدعوم للتحليل.`);
      }
      items.push(item);
      downloaded.push(await downloadDriveFileForAnalysis(token, item));
    }
    validateFiles(downloaded);
    return { items, downloaded };
  }

  async function chooseFromDrive() {
    try {
      setBusy(true);
      resetMessages();
      setMessage("جاري فتح Google Drive…");
      const token = await ensureDriveAccessToken();
      const picked = await pickDriveFiles(token, {
        multiple: true,
        title: "اختيار ملف أو أكثر من Google Drive",
      });
      if (!picked.length) {
        setMessage("");
        return;
      }

      setMessage("جاري تجهيز الملفات المختارة…");
      const { items, downloaded } = await downloadPickedItems(token, picked);
      setFiles(downloaded);
      setLinkedDriveItems(items);
      setLinkedSource(
        items.length === 1
          ? {
              kind: "file",
              id: items[0].id,
              name: items[0].name,
              ...(items[0].webViewLink ? { webViewLink: items[0].webViewLink } : {}),
            }
          : null
      );
      setSourceMode("standard");
      setSourceLabel("ملف مرتبط من Google Drive");
      setMessage(
        items.length === 1
          ? "تم ربط الملف من Google Drive ولن يُنقل من مكانه."
          : `تم اختيار ${items.length} ملفات من Google Drive كشاهد واحد.`
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      setIsError(true);
      setMessage(driveErrorMessage(raw));
    } finally {
      setBusy(false);
    }
  }

  async function linkNewFolder() {
    const user = requireAuth().currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setBusy(true);
      resetMessages();
      setMessage("جاري فتح Google Drive لاختيار المجلد…");
      const token = await ensureDriveAccessToken();
      const picked = await pickDriveFolder(token);
      if (!picked) {
        setMessage("");
        return;
      }
      const folder = await getDriveFile(token, picked.id);
      const next = await upsertLinkedDriveFolder(user.uid, {
        id: folder.id,
        name: folder.name || picked.name,
        ...(folder.webViewLink ? { webViewLink: folder.webViewLink } : {}),
      });
      setLinkedFolders(next);
      setMessage(
        `تم ربط مجلد «${folder.name || picked.name}». عند إضافة شهادات جديدة استخدمي زر «تحديث» بجانبه.`
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      setIsError(true);
      setMessage(driveErrorMessage(raw));
    } finally {
      setBusy(false);
    }
  }

  async function refreshFolder(folder: LinkedDriveFolder) {
    const user = requireAuth().currentUser;
    if (!user) {
      router.push("/login");
      return;
    }

    try {
      setBusy(true);
      resetMessages();
      setMessage(`جاري فتح مجلد «${folder.name}»…`);
      const token = await ensureDriveAccessToken();
      const picked = await pickDriveFiles(token, {
        parentId: folder.id,
        multiple: true,
        title: `اختاري الشهادات الجديدة من «${folder.name}»`,
      });
      if (!picked.length) {
        setMessage("");
        return;
      }

      const existing = await listUserEvidence(user.uid, { includeArchived: true });
      const usedDriveIds = new Set(
        existing.flatMap((item) => [
          ...(item.driveFileId ? [item.driveFileId] : []),
          ...(item.attachments ?? [])
            .map((attachment) => attachment.driveFileId)
            .filter((value): value is string => Boolean(value)),
        ])
      );
      const fresh = picked.filter((item) => !usedDriveIds.has(item.id));
      const skipped = picked.length - fresh.length;

      if (!fresh.length) {
        const next = await touchLinkedDriveFolder(user.uid, folder.id);
        setLinkedFolders(next);
        setMessage("الملفات التي اخترتها موجودة مسبقًا في أثري. لا يوجد جديد لإضافته.");
        return;
      }

      setMessage(`جاري تجهيز ${fresh.length} ${fresh.length === 1 ? "شهادة" : "شهادات"} جديدة…`);
      const { items, downloaded } = await downloadPickedItems(token, fresh);
      const next = await touchLinkedDriveFolder(user.uid, folder.id);
      setLinkedFolders(next);
      setFiles(downloaded);
      setLinkedDriveItems(items);
      setLinkedSource({
        kind: "folder",
        id: folder.id,
        name: folder.name,
        ...(folder.webViewLink ? { webViewLink: folder.webViewLink } : {}),
      });
      setSourceMode("folder_batch");
      setSourceLabel(`مجلد Google Drive: ${folder.name}`);
      setMessage(
        `${fresh.length} ${fresh.length === 1 ? "شهادة جديدة جاهزة" : "شهادات جديدة جاهزة"} للإضافة كشواهد مستقلة${
          skipped ? ` · تم تجاهل ${skipped} مضافة مسبقًا` : ""
        }.`
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      setIsError(true);
      setMessage(driveErrorMessage(raw));
    } finally {
      setBusy(false);
    }
  }

  async function unlinkFolder(folder: LinkedDriveFolder) {
    const user = requireAuth().currentUser;
    if (!user) return;
    if (!window.confirm(`إلغاء ربط مجلد «${folder.name}» من أثري؟ لن يُحذف أي ملف من Google Drive.`)) {
      return;
    }
    try {
      setBusy(true);
      const next = await removeLinkedDriveFolder(user.uid, folder.id);
      setLinkedFolders(next);
      setMessage("أُلغي ربط المجلد، ولم يُحذف أي ملف من Google Drive.");
      setIsError(false);
    } catch {
      setIsError(true);
      setMessage("تعذر إلغاء ربط المجلد الآن.");
    } finally {
      setBusy(false);
    }
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    if (linkedDriveItems.length) {
      setLinkedDriveItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    }
    resetMessages();
  }

  async function frameworkForAnalysis() {
    const baseFramework = await getActiveFrameworkElements();
    return baseFramework.map((element) => ({
      ...element,
      requirements: requirementsForElement(element.id).map((requirement) => ({
        id: requirement.id,
        label: requirement.label,
      })),
    }));
  }

  async function processFolderBatch(user: User, driveToken: string) {
    if (!linkedSource || linkedSource.kind !== "folder") {
      throw new Error("FOLDER_SOURCE_REQUIRED");
    }

    const framework = await frameworkForAnalysis();
    let completed = 0;

    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const source = linkedDriveItems[index];
      if (!source?.id) continue;

      setMessage(
        files.length === 1
          ? "جاري تحليل الشهادة الجديدة…"
          : `جاري تحليل الشهادة ${index + 1} من ${files.length}…`
      );

      const { contentHash, fileHashes } = await computeEvidenceBundleHash([file]);
      const duplicate = await findDuplicateEvidence({
        uid: user.uid,
        academicYear,
        files: [file],
        contentHash,
      });

      if (
        duplicate &&
        ["approved", "ready_for_review", "needs_info"].includes(duplicate.status)
      ) {
        continue;
      }

      const evidenceId = duplicate?.id ??
        (await createEvidenceDraft({
          ownerUid: user.uid,
          academicYear,
          files: [file],
          contentHash,
          fileHashes,
        }));

      try {
        if (duplicate && !duplicate.contentHash) {
          await setEvidenceContentHash(evidenceId, contentHash);
        }
        const attachment: EvidenceAttachment = {
          attachmentId: duplicate?.attachments?.[0]?.attachmentId ?? newAttachmentId(),
          originalFileName: source.name || file.name,
          mimeType: source.mimeType || file.type || "application/octet-stream",
          fileSize: file.size,
          contentHash: fileHashes[0],
          driveFileId: source.id,
          ...(source.webViewLink ? { driveWebViewLink: source.webViewLink } : {}),
          driveParentFolderId: linkedSource.id,
          sourceKind: "drive_link",
        };
        await attachDriveFiles(evidenceId, [attachment]);
        await saveEvidenceDriveSource(evidenceId, linkedSource);
        await markAnalyzing(evidenceId);
        const analysis = await analyzeEvidence([file], framework);
        await saveAnalysis(evidenceId, analysis);
        completed += 1;
      } catch (error) {
        const raw = error instanceof Error ? error.message : "UNKNOWN";
        await markAnalysisFailed(evidenceId, raw).catch(() => undefined);
        throw error;
      }
    }

    if (!completed) {
      setMessage("لم تُضف شواهد جديدة لأن الملفات المختارة موجودة مسبقًا في أثري.");
      setIsError(false);
      return;
    }

    router.push("/evidence");
  }

  async function processEvidence() {
    if (!files.length) return;

    let evidenceId = "";
    let stage: "prepare" | "drive" | "analysis" = "prepare";

    try {
      setBusy(true);
      setIsError(false);

      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      setMessage("جاري تجهيز حفظ الشاهد…");
      let driveToken = "";
      try {
        driveToken = await ensureDriveAccessToken();
      } catch {
        throw new Error("DRIVE_SIGNIN_REQUIRED");
      }

      if (sourceMode === "folder_batch") {
        await processFolderBatch(user, driveToken);
        return;
      }

      setMessage("جاري التحقق من عدم تكرار الشاهد…");
      const { contentHash, fileHashes } = await computeEvidenceBundleHash(files);

      const duplicate = await findDuplicateEvidence({
        uid: user.uid,
        academicYear,
        files,
        contentHash,
      });

      if (
        duplicate &&
        ["approved", "ready_for_review", "needs_info"].includes(
          duplicate.status
        )
      ) {
        if (!duplicate.contentHash) {
          await setEvidenceContentHash(duplicate.id, contentHash).catch(
            () => undefined
          );
        }
        router.push(`/evidence/review?id=${encodeURIComponent(duplicate.id)}`);
        return;
      }

      if (duplicate) {
        evidenceId = duplicate.id;
        if (!duplicate.contentHash) {
          await setEvidenceContentHash(duplicate.id, contentHash);
        }
      } else {
        evidenceId = await createEvidenceDraft({
          ownerUid: user.uid,
          academicYear,
          files,
          contentHash,
          fileHashes,
        });
      }

      stage = "drive";

      if (isDriveLinked) {
        const linkedAttachments: EvidenceAttachment[] = files.map((file, index) => {
          const source = linkedDriveItems[index];
          return {
            attachmentId: newAttachmentId(),
            originalFileName: source?.name || file.name,
            mimeType: source?.mimeType || file.type || "application/octet-stream",
            fileSize: file.size,
            ...(fileHashes[index] ? { contentHash: fileHashes[index] } : {}),
            ...(source?.id ? { driveFileId: source.id } : {}),
            ...(source?.webViewLink ? { driveWebViewLink: source.webViewLink } : {}),
            ...(source?.parents?.[0] ? { driveParentFolderId: source.parents[0] } : {}),
            sourceKind: "drive_link",
          };
        });
        await attachDriveFiles(evidenceId, linkedAttachments);
        if (linkedSource) await saveEvidenceDriveSource(evidenceId, linkedSource);
      } else {
        const existingAttachments = duplicate?.attachments?.length
          ? duplicate.attachments
          : duplicate && files.length === 1
          ? ([legacyAttachmentFromRecord(duplicate)].filter(Boolean) as EvidenceAttachment[])
          : [];

        const prior = matchPriorAttachments(files, fileHashes, existingAttachments);
        const ids = files.map((_, index) => prior[index]?.attachmentId ?? newAttachmentId());
        const progress: (EvidenceAttachment | undefined)[] = files.map((_, index) =>
          prior[index]?.driveFileId ? { ...prior[index]!, attachmentId: ids[index] } : undefined
        );

        const snapshot = () =>
          files.map(
            (file, index): EvidenceAttachment =>
              progress[index] ?? {
                attachmentId: ids[index],
                originalFileName: file.name,
                mimeType: file.type || "application/octet-stream",
                fileSize: file.size,
                ...(fileHashes[index] ? { contentHash: fileHashes[index] } : {}),
                sourceKind: "athari_upload",
              }
          );

        let inboxId = "";
        for (let index = 0; index < files.length; index += 1) {
          if (progress[index]) continue;
          const file = files[index];
          if (!inboxId) {
            setMessage(
              files.length > 1
                ? `جاري حفظ ${files.length} ملفات في Google Drive…`
                : "جاري حفظ الملف في Google Drive…"
            );
            const { inbox } = await ensureAthariInbox(driveToken, academicYear);
            inboxId = inbox.id;
          }

          const saved = await uploadEvidenceToDrive(driveToken, file, inboxId);
          progress[index] = {
            attachmentId: ids[index],
            originalFileName: file.name,
            mimeType: file.type || "application/octet-stream",
            fileSize: file.size,
            contentHash: fileHashes[index],
            driveFileId: saved.id,
            ...(saved.webViewLink ? { driveWebViewLink: saved.webViewLink } : {}),
            driveParentFolderId: inboxId,
            sourceKind: "athari_upload",
          };
          await saveAttachmentProgress(evidenceId, snapshot());
        }

        const completed = progress.filter(Boolean) as EvidenceAttachment[];
        await attachDriveFiles(evidenceId, completed);
      }

      await markAnalyzing(evidenceId);
      stage = "analysis";
      setMessage("جاري تحليل الشاهد…");

      const framework = await frameworkForAnalysis();
      const analysis = await analyzeEvidence(files, framework);
      await saveAnalysis(evidenceId, analysis);

      router.push(`/evidence/review?id=${encodeURIComponent(evidenceId)}`);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      if (evidenceId && stage === "analysis") {
        await markAnalysisFailed(evidenceId, raw).catch(() => undefined);
      }
      setIsError(true);

      if (raw === "AI_FREE_LIMIT_REACHED") {
        setMessage("اكتملت حصة التحليل لهذا اليوم. الملفات محفوظة ومسجلة، ولن تُرفع مرة أخرى عند إعادة المحاولة.");
      } else if (raw === "DRIVE_SIGNIN_REQUIRED" || raw === "DRIVE_RECONNECT_REQUIRED") {
        setMessage("يرجى تسجيل الدخول إلى Google لمتابعة حفظ الشاهد.");
      } else if (stage === "drive") {
        setMessage("تعذر حفظ بيانات الشاهد في Google Drive الآن. أعيدي المحاولة.");
      } else {
        setMessage(raw.startsWith("DRIVE_") ? driveErrorMessage(raw) : "تعذر إكمال العملية الآن. أعيدي المحاولة دون تغيير الملفات.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AthShell back={{ href: "/evidence" }} title="إضافة شاهد" subtitle="إضافة ملفات للإنجاز نفسه أو تحديث مجلد مرتبط.">
      <div className="ath-steps" aria-label="مراحل إضافة الشاهد">
        <span className="on"><b>1</b>اختيار</span>
        <span className={busy ? "on" : ""}><b>2</b>تحليل</span>
        <span><b>3</b>مراجعة</span>
      </div>

      <div className="v7-field-head">
        <strong>مصدر الشاهد</strong>
        <InfoTip text="يمكن رفع الملفات من الجهاز، اختيار ملفات من Google Drive، أو ربط مجلد متجدد مثل «دوراتي»." />
      </div>

      <div className="ath-actions" style={{ marginBottom: 12 }}>
        <label className="ath-btn outline fit" style={{ cursor: "pointer" }}>
          <Glyph name="upload" size={18} /> من الجهاز
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.pdf,.docx"
            onChange={(event) => chooseFiles(event.target.files)}
            disabled={busy}
            style={{ display: "none" }}
          />
        </label>
        <button type="button" className="ath-btn outline fit" onClick={chooseFromDrive} disabled={busy}>
          <Glyph name="docOutline" size={18} /> ملف من Drive
        </button>
        <button type="button" className="ath-btn outline fit" onClick={linkNewFolder} disabled={busy}>
          <Glyph name="folder" size={18} /> ربط مجلد
        </button>
      </div>

      {linkedFolders.length ? (
        <Panel
          icon={<Glyph name="folder" size={22} />}
          title="المجلدات المرتبطة"
          sub="اربطِي المجلد مرة واحدة، ثم استخدمي «تحديث» عند إضافة ملفات جديدة."
        >
          <div className="ath-stack">
            {linkedFolders.map((folder) => (
              <div className="ath-file-row" key={folder.id}>
                <span className="ic"><Glyph name="folder" size={18} /></span>
                <div className="nm">
                  <strong>{folder.name}</strong>
                  <span>{folder.lastCheckedAt ? "تمت مراجعته سابقًا" : "مرتبط وجاهز للتحديث"}</span>
                </div>
                <button
                  type="button"
                  className="ath-mini blue"
                  onClick={() => refreshFolder(folder)}
                  disabled={busy}
                >
                  تحديث
                </button>
                <button
                  type="button"
                  className="ath-icon-btn"
                  onClick={() => unlinkFolder(folder)}
                  disabled={busy}
                  aria-label={`إلغاء ربط ${folder.name}`}
                >
                  <Glyph name="trash" size={16} />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      <label className="ath-drop">
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,.pdf,.docx"
          onChange={(event) => chooseFiles(event.target.files)}
          disabled={busy}
        />
        <ElementArt art="planner" className="art" />
        <strong>{files.length ? "تغيير الملفات المختارة" : "أضيفي ملفات الشاهد"}</strong>
        <span className="fake"><Glyph name="upload" size={18} />اختيار الملفات</span>
        <small>PDF أو صور أو Word · حتى {MAX_FILES} ملفات · 10 MB لكل ملف</small>
      </label>

      {files.length ? (
        <Panel
          icon={<Glyph name="folder" size={22} />}
          title={files.length === 1 ? "ملف واحد" : files.length === 2 ? "ملفان" : `${files.length} ملفات`}
          sub={`${formatSize(totalBytes)} إجمالًا · ${sourceLabel || "شاهد واحد"}`}
        >
          {sourceMode === "folder_batch" ? (
            <Notice>
              الملفات الجديدة من المجلد ستُنشأ كشواهد مستقلة، حتى تكون كل شهادة دورة قابلة للمراجعة والاعتماد بمفردها.
            </Notice>
          ) : isDriveLinked ? (
            <Notice>الملفات مرتبطة من Google Drive وتبقى في موقعها الأصلي. لا ينقلها أثري عند الاعتماد.</Notice>
          ) : null}
          <div className="ath-stack" style={{ marginTop: isDriveLinked ? 10 : 0 }}>
            {files.map((file, index) => (
              <div className="ath-file-row" key={`${file.name}-${file.size}-${index}`}>
                <span className="ic"><Glyph name="docOutline" size={18} /></span>
                <div className="nm">
                  <strong>{linkedDriveItems[index]?.name || file.name}</strong>
                  <span>{formatSize(file.size)}{isDriveLinked ? " · مرتبط" : ""}</span>
                </div>
                <button type="button" className="ath-icon-btn" onClick={() => removeFile(index)} disabled={busy} aria-label={`إزالة ${file.name}`}>
                  <Glyph name="trash" size={17} />
                </button>
              </div>
            ))}
          </div>
        </Panel>
      ) : null}

      {busy ? (
        <section className="ath-panel ath-scene-card" aria-live="polite">
          <Scene kind="analyzing" />
          <strong>{message || "جاري تنفيذ العملية…"}</strong>
          <p>أبقي الصفحة مفتوحة حتى تكتمل العملية.</p>
        </section>
      ) : message ? (
        <Notice tone={isError ? "error" : "info"}>{message}</Notice>
      ) : null}

      <button type="button" className="ath-btn primary block" onClick={processEvidence} disabled={!files.length || busy}>
        <Glyph name="sparkle" />
        {busy
          ? "جاري الحفظ والتحليل…"
          : sourceMode === "folder_batch"
          ? files.length === 1
            ? "تحليل الشهادة الجديدة"
            : `تحليل ${files.length} شهادات كشواهد مستقلة`
          : "حفظ وتحليل الشاهد"}
      </button>
    </AthShell>
  );
}
