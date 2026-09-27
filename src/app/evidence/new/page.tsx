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
import { ensureAthariInbox, uploadEvidenceToDrive } from "@/lib/drive";
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
import { EvidenceAttachment } from "@/types/athari";
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
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const academicYear =
    process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  const totalBytes = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files]
  );

  function chooseFiles(list: FileList | null) {
    setMessage("");
    setIsError(false);

    const selected = Array.from(list ?? []);
    if (!selected.length) {
      setFiles([]);
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

    if (unique.length > MAX_FILES) {
      setFiles([]);
      setMessage(`الحد الأعلى ${MAX_FILES} ملفات للشاهد الواحد.`);
      setIsError(true);
      return;
    }

    const oversized = unique.find((file) => file.size > MAX_FILE_BYTES);
    if (oversized) {
      setFiles([]);
      setMessage(`الملف «${oversized.name}» أكبر من 10 MB.`);
      setIsError(true);
      return;
    }

    const unsupported = unique.find((file) => !isAccepted(file));
    if (unsupported) {
      setFiles([]);
      setMessage("الصيغ المدعومة: PDF، وصور JPG/PNG/WebP، وملفات Word DOCX.");
      setIsError(true);
      return;
    }

    const total = unique.reduce((sum, file) => sum + file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setFiles([]);
      setMessage("إجمالي ملفات الشاهد يجب ألا يتجاوز 30 MB.");
      setIsError(true);
      return;
    }

    setFiles(unique);
  }

  function removeFile(index: number) {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMessage("");
    setIsError(false);
  }

  async function processEvidence() {
    if (!files.length) return;

    let evidenceId = "";

    try {
      setBusy(true);
      setIsError(false);

      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
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

      const existingAttachments = duplicate?.attachments?.length
        ? duplicate.attachments
        : duplicate && files.length === 1
        ? ([legacyAttachmentFromRecord(duplicate)].filter(Boolean) as EvidenceAttachment[])
        : [];

      // Pair each file with what is already recorded (name + size + hash, used once).
      const prior = matchPriorAttachments(files, fileHashes, existingAttachments);
      const ids = files.map((_, index) => prior[index]?.attachmentId ?? newAttachmentId());
      const progress: (EvidenceAttachment | undefined)[] = files.map((_, index) =>
        prior[index]?.driveFileId ? { ...prior[index]!, attachmentId: ids[index] } : undefined
      );

      // Pending entries keep the file's metadata and hash (no Drive id yet).
      const snapshot = () =>
        files.map(
          (file, index): EvidenceAttachment =>
            progress[index] ?? {
              attachmentId: ids[index],
              originalFileName: file.name,
              mimeType: file.type || "application/octet-stream",
              fileSize: file.size,
              ...(fileHashes[index] ? { contentHash: fileHashes[index] } : {}),
            }
        );

      let driveToken = "";
      let inboxId = "";

      for (let index = 0; index < files.length; index += 1) {
        if (progress[index]) continue; // already in Drive and recorded

        const file = files[index];
        if (!driveToken) {
          setMessage(
            files.length > 1
              ? `جاري حفظ ${files.length} ملفات في Google Drive…`
              : "جاري حفظ الملف في Google Drive…"
          );
          driveToken = await ensureDriveAccessToken();
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
        };

        // Record this file in Athari now, before uploading the next one.
        await saveAttachmentProgress(evidenceId, snapshot());
      }

      const completed = progress.filter(Boolean) as EvidenceAttachment[];
      await attachDriveFiles(evidenceId, completed);
      await markAnalyzing(evidenceId);

      setMessage("جاري تحليل الشاهد…");

      const framework = await getActiveFrameworkElements();
      const analysis = await analyzeEvidence(files, framework);
      await saveAnalysis(evidenceId, analysis);

      router.push(`/evidence/review?id=${encodeURIComponent(evidenceId)}`);
    } catch (error) {
      const raw = error instanceof Error ? error.message : "UNKNOWN";
      if (evidenceId) {
        await markAnalysisFailed(evidenceId, raw).catch(() => undefined);
      }
      setIsError(true);

      if (raw === "AI_FREE_LIMIT_REACHED") {
        setMessage(
          "اكتملت حصة التحليل لهذا اليوم. الملفات محفوظة ومسجلة، ولن تُرفع مرة أخرى عند إعادة المحاولة."
        );
      } else if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setMessage(
          "انتهت جلسة Google Drive. أعيدي المحاولة لإعادة الربط؛ الملفات التي اكتمل رفعها مسجلة ولن تُرفع مرة أخرى."
        );
      } else {
        setMessage(
          "تعذر إكمال العملية الآن. الملفات التي اكتمل رفعها مسجلة، ولن تُرفع مرة أخرى عند إعادة المحاولة."
        );
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
        <strong>ملفات الشاهد</strong>
        <InfoTip text="يمكن إضافة أكثر من ملف للشاهد نفسه." />
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
          sub={`${formatSize(totalBytes)} إجمالًا · تُحفظ شاهدًا واحدًا`}
        >
          <div className="ath-stack">
            {files.map((file, index) => (
              <div className="ath-file-row" key={`${file.name}-${file.size}-${file.lastModified}`}>
                <span className="ic"><Glyph name="docOutline" size={18} /></span>
                <div className="nm"><strong>{file.name}</strong><span>{formatSize(file.size)}</span></div>
                <button
                  type="button"
                  className="ath-icon-btn"
                  onClick={() => removeFile(index)}
                  disabled={busy}
                  aria-label={`إزالة ${file.name}`}
                >
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

      <button
        type="button"
        className="ath-btn primary block"
        onClick={processEvidence}
        disabled={!files.length || busy}
      >
        <Glyph name="sparkle" />
        {busy ? "جاري الحفظ والتحليل…" : "حفظ وتحليل الشاهد"}
      </button>

    </AthShell>
  );
}
