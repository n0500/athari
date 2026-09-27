"use client";

import { useMemo, useState } from "react";
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
  GOOGLE_FOLDER_MIME,
  listDriveFolderFiles,
  uploadEvidenceToDrive,
  type DriveFile,
} from "@/lib/drive";
import { pickDriveItem } from "@/lib/drivePicker";
import { saveEvidenceDriveSource } from "@/lib/driveSource";
import {
  attachDriveFiles,
  computeEvidenceBundleHash,
  createEvidenceDraft,
  findDuplicateEvidence,
  getActiveFrameworkElements,
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

export default function NewEvidencePage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [linkedDriveItems, setLinkedDriveItems] = useState<DriveFile[]>([]);
  const [linkedSource, setLinkedSource] = useState<DriveSourceLink | null>(null);
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

  function resetMessages() {
    setMessage("");
    setIsError(false);
  }

  function validateFiles(selected: File[]) {
    if (selected.length > MAX_FILES) {
      throw new Error(`الحد الأعلى ${MAX_FILES} ملفات للشاهد الواحد.`);
    }
    const oversized = selected.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) throw new Error(`الملف «${oversized.name}» أكبر من 10 MB.`);
    const unsupported = selected.find((file) => !isAccepted(file));
    if (unsupported) {
      throw new Error("الصيغ المدعومة: PDF، وصور JPG/PNG/WebP، وملفات Word DOCX.");
    }
    const total = selected.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      throw new Error("إجمالي ملفات الشاهد يجب ألا يتجاوز 30 MB.");
    }
  }

  function chooseFiles(list: FileList | null) {
    resetMessages();
    const selected = Array.from(list ?? []);
    if (!selected.length) {
      setFiles([]);
      setLinkedDriveItems([]);
      setLinkedSource(null);
      setSourceLabel("");
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
    } catch (error) {
      setFiles([]);
      setLinkedDriveItems([]);
      setLinkedSource(null);
      setSourceLabel("");
      setMessage(error instanceof Error ? error.message : "تعذر اختيار الملفات.");
      setIsError(true);
    }
  }

  async function chooseFromDrive() {
    try {
      setBusy(true);
      resetMessages();
      setMessage("جاري فتح Google Drive…");
      const token = await ensureDriveAccessToken();
      const picked = await pickDriveItem(token);
      if (!picked) {
        setMessage("");
        return;
      }

      let items: DriveFile[] = [];
      let source: DriveSourceLink;
      if (picked.mimeType === GOOGLE_FOLDER_MIME) {
        const folder = await getDriveFile(token, picked.id);
        source = {
          kind: "folder",
          id: folder.id,
          name: folder.name || picked.name,
          ...(folder.webViewLink ? { webViewLink: folder.webViewLink } : {}),
        };
        const folderItems = await listDriveFolderFiles(token, picked.id);
        items = folderItems.filter(driveItemIsSupported);
        if (!items.length) {
          throw new Error("لا يحتوي المجلد على ملفات مدعومة للتحليل.");
        }
        if (items.length > MAX_FILES) {
          throw new Error(`يحتوي المجلد على أكثر من ${MAX_FILES} ملفات مدعومة. اختاري مجلدًا أصغر أو ارفعي الملفات على أكثر من شاهد.`);
        }
        setMessage(`جاري تجهيز ملفات المجلد «${picked.name}»…`);
      } else {
        const item = await getDriveFile(token, picked.id);
        source = {
          kind: "file",
          id: item.id,
          name: item.name,
          ...(item.webViewLink ? { webViewLink: item.webViewLink } : {}),
        };
        if (!driveItemIsSupported(item)) {
          throw new Error("هذا النوع من الملفات غير مدعوم للتحليل في أثري.");
        }
        items = [item];
        setMessage(`جاري تجهيز «${item.name}»…`);
      }

      const downloaded: File[] = [];
      for (const item of items) {
        downloaded.push(await downloadDriveFileForAnalysis(token, item));
      }
      validateFiles(downloaded);

      setFiles(downloaded);
      setLinkedDriveItems(items);
      setLinkedSource(source);
      setSourceLabel(
        picked.mimeType === GOOGLE_FOLDER_MIME
          ? `مجلد Google Drive: ${picked.name}`
          : "ملف مرتبط من Google Drive"
      );
      setMessage(
        picked.mimeType === GOOGLE_FOLDER_MIME
          ? `تم ربط المجلد «${picked.name}» · ${items.length} ${items.length === 1 ? "ملف" : "ملفات"}. لن تُنقل الأصول من مكانها.`
          : "تم ربط الملف من Google Drive ولن يُنقل من مكانه."
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      setIsError(true);
      if (raw === "PICKER_NOT_CONFIGURED" || raw === "PICKER_UNAVAILABLE") {
        setMessage("تعذر فتح اختيار Google Drive. يلزم تفعيل Google Picker API للمشروع مرة واحدة.");
      } else if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setMessage("يرجى تسجيل الدخول إلى Google ثم إعادة اختيار الملف أو المجلد.");
      } else {
        setMessage(raw.startsWith("DRIVE_") ? "تعذر قراءة الملف أو المجلد من Google Drive." : raw);
      }
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

      const baseFramework = await getActiveFrameworkElements();
      const framework = baseFramework.map((element) => ({
        ...element,
        requirements: requirementsForElement(element.id).map((requirement) => ({
          id: requirement.id,
          label: requirement.label,
        })),
      }));
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
        setMessage("تعذر إكمال العملية الآن. أعيدي المحاولة دون تغيير الملفات.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AthShell back={{ href: "/evidence" }} title="إضافة شاهد" subtitle="إضافة ملفات للإنجاز نفسه.">
      <div className="ath-steps" aria-label="مراحل إضافة الشاهد">
        <span className="on"><b>1</b>اختيار</span>
        <span className={busy ? "on" : ""}><b>2</b>تحليل</span>
        <span><b>3</b>مراجعة</span>
      </div>

      <div className="v7-field-head">
        <strong>مصدر الشاهد</strong>
        <InfoTip text="يمكن رفع الملفات من الجهاز أو ربط ملف أو مجلد من Google Drive. الملفات المرتبطة تبقى في مكانها الأصلي." />
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
          <Glyph name="folder" size={18} /> من Google Drive
        </button>
      </div>

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
          {isDriveLinked ? (
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
          <strong>{message || "جاري تحليل الشاهد…"}</strong>
          <p>أبقي الصفحة مفتوحة حتى يكتمل التحليل.</p>
        </section>
      ) : message ? (
        <Notice tone={isError ? "error" : "info"}>{message}</Notice>
      ) : null}

      <button type="button" className="ath-btn primary block" onClick={processEvidence} disabled={!files.length || busy}>
        <Glyph name="sparkle" />
        {busy ? "جاري الحفظ والتحليل…" : "حفظ وتحليل الشاهد"}
      </button>
    </AthShell>
  );
}
