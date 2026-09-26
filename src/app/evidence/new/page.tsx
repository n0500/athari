"use client";

import { useState } from "react";
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
      const { contentHash, fileHashes } =
        await computeEvidenceBundleHash(files);

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
        ? [legacyAttachmentFromRecord(duplicate)].filter(
            Boolean
          ) as EvidenceAttachment[]
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
          const { inbox } = await ensureAthariInbox(
            driveToken,
            academicYear
          );
          inboxId = inbox.id;
        }

        const saved = await uploadEvidenceToDrive(
          driveToken,
          file,
          inboxId
        );

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
    <AppShell title="إضافة شاهد" subtitle="يمكن أن يتكون الشاهد من ملف واحد أو عدة ملفات">
      <section className="upload-card">
        <div className="upload-icon">
          <Icon name="upload" size={30} />
        </div>
        <h1>ارفعي ملفات الشاهد</h1>
        <p>
          صورة واحدة أو عدة صور وملفات متنوعة؛ أثري يجمعها في سجل واحد
          ويحللها معًا كشاهد واحد.
        </p>

        <label className="upload-picker">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,.pdf,.docx"
            onChange={(event) => chooseFiles(event.target.files)}
            disabled={busy}
          />
          <span>
            {files.length
              ? files.length === 1
                ? files[0].name
                : `${files.length} ملفات مختارة`
              : "اختيار صور أو ملفات"}
          </span>
        </label>

        {files.length ? (
          <div
            style={{
              display: "grid",
              gap: 7,
              marginTop: 12,
              textAlign: "right",
            }}
          >
            {files.map((file, index) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                style={{
                  padding: "9px 11px",
                  border: "1px solid #e3e8e4",
                  borderRadius: 12,
                  background: "#f8faf8",
                  fontSize: 12,
                }}
              >
                {index + 1}. {file.name}
              </div>
            ))}
          </div>
        ) : null}

        {files.length ? (
          <button
            className="primary-button full-button process-button"
            onClick={processEvidence}
            disabled={busy}
            style={{ marginTop: 12 }}
          >
            <Icon name="sparkle" size={20} />
            {busy ? "جاري الحفظ والتحليل…" : "حفظ وتحليل الشاهد"}
          </button>
        ) : null}

        {message ? (
          <div className={`flow-message ${isError ? "is-error" : ""}`}>
            {message}
          </div>
        ) : null}

        <div className="privacy-row">
          <Icon name="check" size={18} />
          <span>
            حتى 8 ملفات، 10 MB للملف و30 MB للحزمة كاملة. التكرار يُمنع
            تلقائيًا.
          </span>
        </div>
      </section>
    </AppShell>
  );
}
