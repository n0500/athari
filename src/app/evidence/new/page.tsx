"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
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
  saveAnalysis,
  setEvidenceContentHash,
} from "@/lib/firestore";
import { analyzeEvidence } from "@/lib/ai";
import { EvidenceAttachment } from "@/types/athari";

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
      setMessage(`يمكن رفع حتى ${MAX_FILES} ملفات للشاهد الواحد.`);
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
      setMessage("استخدمي PDF أو صور JPG/PNG/WebP أو ملفات Word DOCX.");
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

      setMessage("يتحقق أثري من أن حزمة الشاهد غير مكررة…");
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

      const completed: EvidenceAttachment[] = [];
      let driveToken = "";
      let inboxId = "";

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const fileHash = fileHashes[index];
        const existing = existingAttachments.find(
          (attachment) =>
            attachment.contentHash === fileHash && attachment.driveFileId
        );

        if (existing) {
          completed.push(existing);
          continue;
        }

        if (!driveToken) {
          setMessage(
            files.length > 1
              ? `نحفظ ${files.length} ملفات أصلية في Google Drive…`
              : "نحفظ الأصل في Google Drive الخاص بك…"
          );
          driveToken = await ensureDriveAccessToken();
          const { inbox } = await ensureAthariInbox(driveToken, academicYear);
          inboxId = inbox.id;
        }

        const saved = await uploadEvidenceToDrive(driveToken, file, inboxId);

        completed.push({
          originalFileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          contentHash: fileHash,
          driveFileId: saved.id,
          ...(saved.webViewLink
            ? { driveWebViewLink: saved.webViewLink }
            : {}),
          driveParentFolderId: inboxId,
        });
      }

      await attachDriveFiles(evidenceId, completed);
      await markAnalyzing(evidenceId);

      setMessage(
        files.length > 1
          ? "تم حفظ الأصول. أثري يقرأ الملفات معًا كشاهد واحد…"
          : "تم حفظ الأصل. أثري يقرأ الشاهد الآن…"
      );

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
          "اكتملت حصة AI المجانية اليوم. الأصول المحفوظة في Drive لن تتكرر عند إعادة المحاولة."
        );
      } else if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setMessage(
          "انتهت جلسة Drive. اضغطي «حفظ وتحليل الشاهد» مرة أخرى لإعادة الربط؛ الملفات المحفوظة لن تتكرر."
        );
      } else {
        setMessage(
          "تعذر إكمال التحليل الآن. أي ملفات حُفظت في Drive لن ينشئ أثري نسخًا أخرى منها عند إعادة المحاولة."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell title="إضافة شاهد" subtitle="ملف واحد أو حزمة ملفات">
      <section className="upload-stage">
        <div className="flow-steps" aria-label="مراحل إضافة الشاهد">
          <span className="is-current"><b>1</b> اختيار</span>
          <span><b>2</b> تحليل</span>
          <span><b>3</b> مراجعة</span>
        </div>

        <div className="upload-intro">
          <span className="upload-hero-icon"><Icon name="upload" size={28} /></span>
          <span className="eyebrow">شاهد جديد</span>
          <h1>ارفعي كل ما يخص الإنجاز دفعة واحدة</h1>
          <p>
            صور، PDF أو Word. إذا كانت عدة ملفات لنفس الإنجاز، أثري يجمعها
            ويقرأها كشاهد واحد.
          </p>
        </div>

        <label className="premium-upload-picker">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.pdf,.docx"
            onChange={(event) => chooseFiles(event.target.files)}
            disabled={busy}
          />
          <span className="picker-icon"><Icon name="plus" size={22} /></span>
          <div>
            <strong>{files.length ? "تغيير الملفات المختارة" : "اختيار صور أو ملفات"}</strong>
            <small>حتى 8 ملفات · 10 MB لكل ملف</small>
          </div>
        </label>

        {files.length ? (
          <section className="selected-files-card">
            <div className="selected-files-head">
              <div>
                <strong>{files.length === 1 ? "ملف واحد" : `${files.length} ملفات`}</strong>
                <span>{formatSize(totalBytes)} إجمالي</span>
              </div>
              <span className="selected-badge">شاهد واحد</span>
            </div>

            <div className="selected-files-list">
              {files.map((file, index) => (
                <div className="selected-file" key={`${file.name}-${file.size}-${file.lastModified}`}>
                  <span className="file-type-icon"><Icon name="file" size={18} /></span>
                  <div>
                    <strong>{file.name}</strong>
                    <span>{formatSize(file.size)}</span>
                  </div>
                  <button
                    type="button"
                    className="icon-button danger-soft"
                    onClick={() => removeFile(index)}
                    disabled={busy}
                    aria-label={`حذف ${file.name}`}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {message ? (
          <div className={`flow-message ${isError ? "is-error" : ""}`}>
            {busy ? <span className="busy-dot" /> : null}
            {message}
          </div>
        ) : null}

        <button
          className="primary-button full-button large-cta"
          onClick={processEvidence}
          disabled={!files.length || busy}
        >
          <Icon name="sparkle" size={20} />
          {busy ? "جاري الحفظ والتحليل…" : "حفظ وتحليل الشاهد"}
        </button>

        <div className="privacy-strip">
          <Icon name="shield" size={18} />
          <span>
            الأصل يبقى في Google Drive لديك، وأثري يمنع تكرار نفس الحزمة تلقائيًا.
          </span>
        </div>
      </section>
    </AppShell>
  );
}
