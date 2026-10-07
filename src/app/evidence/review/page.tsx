"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AthShell, ElementArt, Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { InfoTip } from "@/components/InfoTip";
import { analyzeEvidence, suggestIndicators } from "@/lib/ai";
import { requireAuth } from "@/lib/firebase";
import { autoRefreshShare } from "@/lib/shareRefresh";
import { DRIVE_CONTINUE_MESSAGE, ensureDriveAccessToken, getStoredDriveToken } from "@/lib/auth";
import {
  ensureAthariElementFolder,
  moveDriveFile,
  upsertAthariBackup,
} from "@/lib/drive";
import {
  getActiveFrameworkElements,
  getEvidence,
  listUserEvidence,
} from "@/lib/firestore";
import { approveEvidenceLinkedSafe } from "@/lib/approveEvidence";
import {
  addSupportingImages,
  evidenceAttachmentsFor,
  isImageAttachment,
  isSupportingImage,
  loadSupportingImagesForAnalysis,
  removeSupportingImage,
} from "@/lib/evidenceAttachments";
import { requirementsForElement } from "@/data/mandatory-requirements";
import {
  AiAnalysis,
  ApprovedContent,
  EvidenceAttachment,
  EvidenceRecord,
  SuggestedClassification,
} from "@/types/athari";

const MAX_CLASSIFICATIONS = 3;

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  return evidenceAttachmentsFor(item);
}

function reanalysisContextFile(item: EvidenceRecord, input: {
  title: string;
  description: string;
  impact: string;
  highlight: string;
}) {
  const facts = (item.aiAnalysis?.extractedFacts ?? [])
    .map((entry) => entry.fact)
    .filter(Boolean);
  const elementNames = item.approvedContent?.classifications?.length
    ? item.approvedContent.classifications.map((entry) => entry.elementName)
    : item.approvedContent?.elementName
    ? [item.approvedContent.elementName]
    : [];

  const text = [
    "سياق الشاهد الحالي قبل قراءة الصور الداعمة الجديدة:",
    `العنوان الحالي: ${input.title.trim()}`,
    `وصف التنفيذ الحالي: ${input.description.trim()}`,
    `الأثر الحالي: ${input.impact.trim()}`,
    input.highlight.trim() ? `مؤشرات التميز الحالية:
${input.highlight.trim()}` : "",
    elementNames.length ? `عناصر الأداء المعتمدة: ${elementNames.join("، ")}` : "",
    facts.length ? `حقائق مستخرجة سابقًا:
- ${facts.join("\n- ")}` : "",
    "التعليمات: استخدم هذا النص كسياق للشاهد، واقرأ الصور الداعمة المرفقة معه. حدّث الصياغة فقط بما تضيفه الصور فعليًا، ولا تستنتج نتائج أو أرقامًا أو أثرًا غير ظاهر.",
  ]
    .filter(Boolean)
    .join("\n\n");

  return new File([text], "athari-current-evidence-context.txt", {
    type: "text/plain;charset=utf-8",
  });
}

function ReviewInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  const [item, setItem] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [primaryId, setPrimaryId] = useState("");
  const [requirementIdsByElement, setRequirementIdsByElement] = useState<Record<string, string[]>>({});
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");
  const [highlight, setHighlight] = useState("");
  const [suggesting, setSuggesting] = useState(false);
  const [indicatorNote, setIndicatorNote] = useState("");
  const [supportingBusy, setSupportingBusy] = useState(false);
  const [supportingNote, setSupportingNote] = useState("");
  const [pendingSupporting, setPendingSupporting] = useState<File[] | null>(null);
  const [supportingError, setSupportingError] = useState(false);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [reanalysisNote, setReanalysisNote] = useState("");
  const [reanalysisError, setReanalysisError] = useState(false);
  const [reanalysisProposal, setReanalysisProposal] = useState<AiAnalysis | null>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("لم يتم تحديد الشاهد.");
      return;
    }

    getEvidence(id)
      .then((record) => {
        setItem(record);

        const analysisSuggestions =
          record?.aiAnalysis?.suggestedClassifications?.slice(0, MAX_CLASSIFICATIONS) ?? [];
        const approved = record?.approvedContent?.classifications ?? [];

        const approvedIds = approved
          .map((entry) => entry.elementId)
          .filter((elementId) =>
            analysisSuggestions.some((suggestion) => suggestion.elementId === elementId)
          )
          .slice(0, MAX_CLASSIFICATIONS);

        if (approvedIds.length) {
          setSelectedIds(approvedIds);
          setPrimaryId(
            approved.find((entry) => entry.isPrimary)?.elementId ?? approvedIds[0]
          );
        } else if (analysisSuggestions[0]) {
          setSelectedIds([analysisSuggestions[0].elementId]);
          setPrimaryId(analysisSuggestions[0].elementId);
        }

        const requirementMap: Record<string, string[]> = {};
        for (const suggestion of analysisSuggestions) {
          const approvedClassification = approved.find(
            (entry) => entry.elementId === suggestion.elementId
          );
          requirementMap[suggestion.elementId] = [
            ...new Set(
              approvedClassification?.requirementIds?.length
                ? approvedClassification.requirementIds
                : suggestion.requirementIds ?? []
            ),
          ];
        }
        setRequirementIdsByElement(requirementMap);

        setTitle(
          record?.approvedContent?.title ?? record?.aiAnalysis?.draftTitle ?? ""
        );
        setDescription(
          record?.approvedContent?.description ?? record?.aiAnalysis?.draftDescription ?? ""
        );
        setImpact(
          record?.approvedContent?.impact ?? record?.aiAnalysis?.draftImpact ?? ""
        );
        // Once the evidence has approved content, that approved value is authoritative —
        // including an intentionally empty highlight. Do not resurrect the AI draft after deletion.
        setHighlight(
          record?.approvedContent
            ? record.approvedContent.highlight ?? ""
            : record?.aiAnalysis?.draftHighlight ?? ""
        );
      })
      .catch(() => setError("تعذر تحميل الشاهد."))
      .finally(() => setLoading(false));
  }, [id]);

  const suggestions = useMemo(
    () => item?.aiAnalysis?.suggestedClassifications?.slice(0, MAX_CLASSIFICATIONS) ?? [],
    [item]
  );

  const selectedClassifications = useMemo(
    () => suggestions.filter((suggestion) => selectedIds.includes(suggestion.elementId)),
    [suggestions, selectedIds]
  );

  async function handleSuggestIndicators() {
    if (!item || suggesting) return;
    if (!title.trim() && !description.trim()) {
      setIndicatorNote("أضيفي عنوان الشاهد أو وصف التنفيذ أولًا، ثم اطلبي الاقتراح.");
      return;
    }
    if (highlight.trim() && !window.confirm("سيُستبدل النص الحالي في حقل مؤشرات التميّز بالاقتراح الجديد. هل تريدين المتابعة؟")) return;
    setSuggesting(true);
    setIndicatorNote("");
    try {
      const approvedNames = item.approvedContent?.classifications?.map((entry) => entry.elementName) ?? [];
      const result = await suggestIndicators({
        title,
        description,
        impact,
        facts: (item.aiAnalysis?.extractedFacts ?? []).map((entry) => entry.fact).filter(Boolean),
        elements: selectedClassifications.length
          ? selectedClassifications.map((entry) => entry.elementName)
          : approvedNames,
      });
      if (result) {
        setHighlight(result.slice(0, 700));
        setIndicatorNote("أُضيف الاقتراح. راجعيه وعدّليه قبل الحفظ.");
      } else {
        setIndicatorNote("لم يجد أثري في بيانات هذا الشاهد ما يدعم مؤشر تميّز. يمكنك إضافة وصف أدق ثم المحاولة مرة أخرى.");
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setIndicatorNote(
        code === "AI_FREE_LIMIT_REACHED"
          ? "بلغت خدمة الاقتراح حدّها اليومي. حاولي لاحقًا."
          : code === "AI_INDICATORS_UNAVAILABLE"
          ? "خدمة الاقتراح غير مفعّلة بعد."
          : "تعذّر الحصول على اقتراح الآن. حاولي مرة أخرى."
      );
    } finally {
      setSuggesting(false);
    }
  }

  async function refreshBackupAfterAttachmentChange(uid: string, token: string) {
    try {
      const all = await listUserEvidence(uid);
      await upsertAthariBackup(token, {
        format: "athari-backup-v4",
        exportedAt: new Date().toISOString(),
        evidence: all.map((entry) => ({
          id: entry.id,
          academicYear: entry.academicYear,
          status: entry.status,
          originalFileName: entry.originalFileName,
          fileCount: entry.fileCount,
          attachments: entry.attachments,
          driveFileId: entry.driveFileId,
          driveWebViewLink: entry.driveWebViewLink,
          driveSource: entry.driveSource,
          approvedContent: entry.approvedContent,
        })),
      });
    } catch {
      // The evidence change is already saved. The regular portfolio flow can
      // refresh the backup later without undoing the user's image update.
    }
  }

  async function handleSupportingImages(files: FileList | null) {
    if (!item || !files?.length || supportingBusy) return;
    const selected = Array.from(files);
    if (supportingInputRef.current) supportingInputRef.current.value = "";

    // Choosing files is not a tap the browser accepts for opening a Google window.
    // Keep the files and ask for one tap on «متابعة» when Drive access has expired.
    if (!getStoredDriveToken()) {
      setPendingSupporting(selected);
      setSupportingError(false);
      setSupportingNote(DRIVE_CONTINUE_MESSAGE);
      return;
    }
    await saveSupportingImages(selected);
  }

  async function continueSupportingImages() {
    const selected = pendingSupporting;
    if (!selected?.length) return;
    try {
      await ensureDriveAccessToken(); // first await: opens directly from the tap
    } catch {
      setSupportingError(true);
      setSupportingNote("لم يكتمل تأكيد حساب Google. اضغطي «متابعة» مرة أخرى.");
      return;
    }
    setPendingSupporting(null);
    await saveSupportingImages(selected);
  }

  async function saveSupportingImages(selected: File[]) {
    if (!item) return;
    setSupportingBusy(true);
    setSupportingNote("");
    setSupportingError(false);

    try {
      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      if (item.ownerUid && item.ownerUid !== user.uid) throw new Error("NOT_OWNER");

      const token = await ensureDriveAccessToken();
      const result = await addSupportingImages({ token, item, files: selected });
      const updated: EvidenceRecord = {
        ...item,
        attachments: result.attachments,
        fileCount: result.attachments.length,
      };
      setItem(updated);
      await refreshBackupAfterAttachmentChange(user.uid, token);
      const shareNote =
        item.status === "approved" && result.added.length ? await autoRefreshShare(user.uid, token) : "";

      const addedCount = result.added.length;
      const skippedCount = result.skipped.length;
      if (addedCount && skippedCount) {
        setSupportingNote(`تمت إضافة ${addedCount} صورة، وتجاوز ${skippedCount} صورة مكررة. يمكنك إعادة تحليل الصور لتحديث الوصف أو الأثر أو مؤشرات التميز.`);
      } else if (addedCount) {
        setSupportingNote(
          item.status === "approved"
            ? `تمت إضافة ${addedCount} ${addedCount === 1 ? "صورة" : "صور"} للشاهد، وظهرت في مشاركة ملف الأداء. ${shareNote}`.trim()
            : `تمت إضافة ${addedCount} ${addedCount === 1 ? "صورة" : "صور"} للشاهد. التحليل اختياري ويمكن تشغيله من الزر أدناه.`
        );
      } else {
        setSupportingNote("الصور المحددة موجودة مسبقًا في هذا الشاهد.");
      }
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setSupportingError(true);
      setSupportingNote(
        code === "DRIVE_RECONNECT_REQUIRED"
          ? "يرجى تسجيل الدخول إلى Google ثم إعادة إضافة الصور."
          : code.startsWith("SUPPORTING_IMAGE_TOO_LARGE:")
          ? `إحدى الصور أكبر من 20 ميجابايت: ${code.split(":").slice(1).join(":")}`
          : code === "SUPPORTING_IMAGES_ONLY"
          ? "اختاري ملفات صور فقط."
          : "تعذر حفظ الصور الآن. لم تتغير بيانات الشاهد الأصلية؛ أعيدي المحاولة."
      );
    } finally {
      setSupportingBusy(false);
    }
  }

  async function handleRemoveSupportingImage(attachment: EvidenceAttachment) {
    if (!item || supportingBusy || !attachment.attachmentId || !isSupportingImage(attachment)) return;
    if (!window.confirm(`إزالة «${attachment.originalFileName}» من الشاهد؟ سيبقى الملف محفوظًا في Google Drive.`)) return;

    setSupportingBusy(true);
    setSupportingNote("");
    setSupportingError(false);
    try {
      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      if (item.ownerUid && item.ownerUid !== user.uid) throw new Error("NOT_OWNER");

      const current = attachmentsFor(item);
      const next = await removeSupportingImage({
        evidenceId: item.id,
        attachments: current,
        attachmentId: attachment.attachmentId,
      });
      const updated: EvidenceRecord = { ...item, attachments: next, fileCount: next.length };
      setItem(updated);

      try {
        // After other awaits a Google window would be blocked; refresh the backup only with a current token.
        const token = getStoredDriveToken();
        if (token) await refreshBackupAfterAttachmentChange(user.uid, token);
        if (item.status === "approved") await autoRefreshShare(user.uid, token);
      } catch {
        // Removing the attachment from the evidence does not require Drive deletion.
      }

      setSupportingNote(
        item.status === "approved"
          ? "أُزيلت الصورة من الشاهد. حدّثي المشاركة ليظهر التغيير للمديرة."
          : "أُزيلت الصورة من الشاهد."
      );
    } catch {
      setSupportingError(true);
      setSupportingNote("تعذر إزالة الصورة الآن. حاولي مرة أخرى.");
    } finally {
      setSupportingBusy(false);
    }
  }

  async function handleReanalyzeSupportingImages() {
    if (!item || reanalyzing) return;
    const supporting = attachmentsFor(item).filter(
      (attachment) => isSupportingImage(attachment) && isImageAttachment(attachment)
    );
    if (!supporting.length) {
      setReanalysisError(true);
      setReanalysisNote("أضيفي صورًا داعمة أولًا، ثم أعيدي التحليل.");
      return;
    }

    setReanalyzing(true);
    setReanalysisNote("");
    setReanalysisError(false);
    setReanalysisProposal(null);

    try {
      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
        return;
      }
      if (item.ownerUid && item.ownerUid !== user.uid) throw new Error("NOT_OWNER");

      const token = await ensureDriveAccessToken();
      const images = await loadSupportingImagesForAnalysis({
        token,
        attachments: supporting,
      });
      const context = reanalysisContextFile(item, {
        title,
        description,
        impact,
        highlight,
      });
      const framework = await getActiveFrameworkElements();
      const proposal = await analyzeEvidence([context, ...images], framework);
      setReanalysisProposal(proposal);
      setReanalysisNote(
        "اكتمل التحليل. راجعي المقترحات أدناه؛ لن يتغير أي حقل حتى تختاري استخدام المقترح."
      );
    } catch (caught) {
      const code = caught instanceof Error ? caught.message : "";
      setReanalysisError(true);
      setReanalysisNote(
        code === "AI_FREE_LIMIT_REACHED"
          ? "اكتملت حصة التحليل لهذا اليوم. الصور محفوظة ويمكن إعادة التحليل لاحقًا."
          : code === "DRIVE_RECONNECT_REQUIRED"
          ? "يرجى تسجيل الدخول إلى Google ثم إعادة التحليل."
          : code === "TOO_MANY_SUPPORTING_IMAGES_FOR_ANALYSIS"
          ? "يمكن إعادة تحليل حتى 7 صور داعمة في المرة الواحدة."
          : code.startsWith("SUPPORTING_IMAGE_TOO_LARGE_FOR_ANALYSIS:")
          ? `هذه الصورة أكبر من حد التحليل (10 MB): ${code.split(":").slice(1).join(":")}`
          : "تعذر إعادة تحليل الصور الآن. لم تتغير الصياغة الحالية."
      );
    } finally {
      setReanalyzing(false);
    }
  }

  function useReanalysisField(field: "description" | "impact" | "highlight") {
    if (!reanalysisProposal) return;
    if (field === "description" && reanalysisProposal.draftDescription.trim()) {
      setDescription(reanalysisProposal.draftDescription.trim());
    }
    if (field === "impact" && reanalysisProposal.draftImpact.trim()) {
      setImpact(reanalysisProposal.draftImpact.trim());
    }
    if (field === "highlight") {
      setHighlight((reanalysisProposal.draftHighlight ?? "").trim().slice(0, 700));
    }
    setReanalysisNote("تم نقل المقترح إلى الحقل. راجعيه ثم اعتمدي الشاهد لحفظ التحديث.");
  }

  const canApprove = useMemo(
    () =>
      Boolean(
        item &&
          selectedClassifications.length &&
          primaryId &&
          title.trim() &&
          description.trim()
      ),
    [item, selectedClassifications, primaryId, title, description]
  );

  function toggleClassification(suggestion: SuggestedClassification) {
    setSelectedIds((current) => {
      if (current.includes(suggestion.elementId)) {
        const next = current.filter((elementId) => elementId !== suggestion.elementId);
        if (primaryId === suggestion.elementId) setPrimaryId(next[0] ?? "");
        return next;
      }
      if (current.length >= MAX_CLASSIFICATIONS) return current;
      const next = [...current, suggestion.elementId];
      if (!primaryId) setPrimaryId(suggestion.elementId);
      return next;
    });
  }

  function toggleRequirement(elementId: string, requirementId: string) {
    setRequirementIdsByElement((current) => {
      const list = current[elementId] ?? [];
      const next = list.includes(requirementId)
        ? list.filter((id) => id !== requirementId)
        : [...list, requirementId];
      return { ...current, [elementId]: next };
    });
  }

  async function approve() {
    if (!item || !selectedClassifications.length || !canApprove) return;

    const primary =
      selectedClassifications.find((suggestion) => suggestion.elementId === primaryId) ??
      selectedClassifications[0];

    const ordered = [
      primary,
      ...selectedClassifications.filter(
        (suggestion) => suggestion.elementId !== primary.elementId
      ),
    ].slice(0, MAX_CLASSIFICATIONS);

    let stage: "drive" | "firestore" | "backup" = "drive";

    try {
      setSaving(true);
      setError("");

      const user = requireAuth().currentUser;
      if (!user) {
        router.push("/login");
        return;
      }

      const originals = attachmentsFor(item);
      const movable = originals.filter(
        (attachment) => attachment.sourceKind !== "drive_link" && attachment.driveFileId
      );

      // Re-approving an approved evidence whose primary element is unchanged and
      // whose files already sit in that element's folder only edits text:
      // Google Drive is not needed, so no Google window opens.
      const previousPrimary =
        item.approvedContent?.classifications?.find((entry) => entry.isPrimary)?.elementId ??
        item.approvedContent?.elementId;
      const filesInPlace =
        Boolean(item.driveParentFolderId) &&
        movable.every((attachment) => attachment.driveParentFolderId === item.driveParentFolderId);
      const textOnly =
        item.status === "approved" && previousPrimary === primary.elementId && (!movable.length || filesInPlace);

      // Must stay the first await of the tap, so the browser allows the Google window.
      const token = textOnly ? getStoredDriveToken() : await ensureDriveAccessToken();

      let movedParentId: string | undefined;
      if (!textOnly && token && movable.length) {
        const { element } = await ensureAthariElementFolder(
          token,
          item.academicYear,
          primary.elementName
        );
        movedParentId = element.id;
        for (const attachment of movable) {
          if (!attachment.driveFileId) continue;
          await moveDriveFile(
            token,
            attachment.driveFileId,
            attachment.driveParentFolderId,
            element.id
          );
        }
      }

      stage = "firestore";

      const approved: ApprovedContent = {
        elementId: primary.elementId,
        elementName: primary.elementName,
        classifications: ordered.map((suggestion) => {
          const allowed = new Set(
            requirementsForElement(suggestion.elementId).map((requirement) => requirement.id)
          );
          return {
            elementId: suggestion.elementId,
            elementName: suggestion.elementName,
            reason: suggestion.reason,
            isPrimary: suggestion.elementId === primary.elementId,
            requirementIds: (requirementIdsByElement[suggestion.elementId] ?? []).filter((id) => allowed.has(id)),
          };
        }),
        title: title.trim(),
        description: description.trim(),
        impact: impact.trim(),
        // Store the empty string too, so deleting all indicators remains an explicit choice.
        highlight: highlight.trim(),
      };

      await approveEvidenceLinkedSafe(id, approved, movedParentId);
      stage = "backup";

      try {
        // Without current Drive access the backup is refreshed on the next approval that has it.
        if (!token) throw new Error("BACKUP_SKIPPED");
        const all = await listUserEvidence(user.uid);
        await upsertAthariBackup(token, {
          format: "athari-backup-v4",
          exportedAt: new Date().toISOString(),
          evidence: all.map((entry) => ({
            id: entry.id,
            academicYear: entry.academicYear,
            status: entry.status,
            originalFileName: entry.originalFileName,
            fileCount: entry.fileCount,
            attachments: entry.attachments,
            driveFileId: entry.driveFileId,
            driveWebViewLink: entry.driveWebViewLink,
            driveSource: entry.driveSource,
            approvedContent: entry.approvedContent,
          })),
        });
      } catch {
        // Approval is already committed; backup can be refreshed later.
      }

      // Keep the principal's link in step with the newly approved content.
      const shareNote = await autoRefreshShare(user.uid, token);
      router.push(shareNote ? "/portfolio?added=1&share_pending=1" : "/portfolio?added=1");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";

      if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setError("يرجى تسجيل الدخول إلى Google ثم الضغط على «اعتماد الشاهد» مرة أخرى.");
      } else if (stage === "drive") {
        setError("تعذر ترتيب أحد ملفات الشاهد في Google Drive الآن. لم يُحذف أي أصل؛ أعيدي المحاولة.");
      } else if (stage === "firestore") {
        setError("تم ترتيب الملفات، لكن تعذر حفظ الاعتماد في أثري. أعيدي المحاولة؛ لن تتكرر الملفات.");
      } else {
        setError("تم الاعتماد، لكن تعذر تحديث النسخة الاحتياطية الآن.");
      }
    } finally {
      setSaving(false);
    }
  }

  const back = { href: "/evidence" };

  if (loading) {
    return (
      <AthShell back={back}>
        <Notice><span className="ath-busy" />جاري تحميل التحليل…</Notice>
      </AthShell>
    );
  }

  if (!item) {
    return (
      <AthShell back={back}>
        <Notice tone="error">{error || "الشاهد غير موجود."}</Notice>
      </AthShell>
    );
  }

  const analysis = item.aiAnalysis;
  const originals = attachmentsFor(item);
  const supportingImages = originals.filter((attachment) =>
    isSupportingImage(attachment) && isImageAttachment(attachment)
  );

  return (
    <AthShell back={back} title="مراجعة الشاهد" subtitle="مراجعة البيانات والتصنيف وبنود المتابعة قبل الاعتماد.">
      <div className="ath-steps" aria-label="مراحل إضافة الشاهد">
        <span className="on"><b>1</b>اختيار</span>
        <span className="on"><b>2</b>تحليل</span>
        <span className="on"><b>3</b>مراجعة</span>
      </div>

      <Panel
        icon={<Glyph name="folder" size={22} />}
        title={originals.length === 1 ? "ملف واحد لهذا الشاهد" : originals.length === 2 ? "ملفان لهذا الشاهد" : `${originals.length} ملفات لهذا الشاهد`}
        sub={originals.some((attachment) => attachment.sourceKind === "drive_link") ? "مرتبط من Google Drive · الأصول تبقى في مكانها" : "الأصول محفوظة في Google Drive"}
      >
        <div className="ath-stack">
          {originals.map((attachment, index) => (
            <div className="ath-file-row" key={`${attachment.originalFileName}-${index}`}>
              <span className="ic"><Glyph name="docOutline" size={18} /></span>
              <div className="nm">
                <strong>{attachment.originalFileName}</strong>
                {attachment.sourceKind === "drive_link" ? <span>مرتبط من Drive</span> : null}
              </div>
              {attachment.driveWebViewLink ? (
                <a className="ath-icon-btn blue" href={attachment.driveWebViewLink} target="_blank" rel="noreferrer" aria-label={`فتح ${attachment.originalFileName}`}>
                  <Glyph name="external" size={17} />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        icon={<Glyph name="upload" size={22} />}
        iconTone="blue"
        title="صور داعمة للشاهد"
        sub="صور التطبيق أو النتائج أو الأثر؛ تُضاف للشاهد الحالي دون إنشاء شاهد جديد أو إعادة التحليل."
      >
        <input
          ref={supportingInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => handleSupportingImages(event.target.files)}
        />

        {supportingImages.length ? (
          <div className="rv-support-gallery" aria-label="الصور الداعمة المضافة">
            {supportingImages.map((attachment) => (
              <figure className="rv-support-image" key={attachment.attachmentId || attachment.originalFileName}>
                {attachment.driveFileId ? (
                  <a
                    href={attachment.driveWebViewLink || `https://drive.google.com/file/d/${encodeURIComponent(attachment.driveFileId)}/view`}
                    target="_blank"
                    rel="noreferrer"
                    title={`فتح ${attachment.originalFileName}`}
                  >
                    <img
                      src={`https://drive.google.com/thumbnail?id=${encodeURIComponent(attachment.driveFileId)}&sz=w640`}
                      alt={attachment.originalFileName}
                      loading="lazy"
                    />
                  </a>
                ) : (
                  <div className="rv-support-placeholder"><Glyph name="docOutline" size={26} /></div>
                )}
                <figcaption>
                  <span title={attachment.originalFileName}>{attachment.originalFileName}</span>
                  <button
                    type="button"
                    className="rv-support-remove"
                    disabled={supportingBusy}
                    onClick={() => handleRemoveSupportingImage(attachment)}
                    aria-label={`إزالة ${attachment.originalFileName} من الشاهد`}
                  >
                    <Glyph name="trash" size={15} />إزالة
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="rv-support-empty">
            <Glyph name="docOutline" size={24} />
            <span>لا توجد صور داعمة مضافة لهذا الشاهد بعد.</span>
          </div>
        )}

        <div className="rv-support-actions">
          <button
            type="button"
            className="ath-btn outline fit"
            disabled={supportingBusy}
            onClick={() => supportingInputRef.current?.click()}
          >
            <Glyph name="plus" size={16} />
            {supportingBusy ? "جاري الحفظ…" : "إضافة صور للشاهد"}
          </button>
          <small>إضافة الصور لا تغيّر الصياغة تلقائيًا. بعد الإضافة يمكنك إعادة تحليلها واختيار ما تريدين تحديثه.</small>
        </div>
        {supportingNote ? <Notice tone={supportingError ? "error" : "info"}>{supportingNote}</Notice> : null}
        {pendingSupporting?.length ? (
          <div className="ath-actions">
            <button type="button" className="ath-btn primary fit" onClick={continueSupportingImages} disabled={supportingBusy}>
              <Glyph name="upload" size={16} />متابعة
            </button>
            <button type="button" className="ath-btn outline fit" onClick={() => { setPendingSupporting(null); setSupportingNote(""); }}>
              إلغاء
            </button>
          </div>
        ) : null}

        {supportingImages.length ? (
          <div className="rv-reanalysis">
            <button
              type="button"
              className="ath-btn outline fit"
              disabled={reanalyzing || supportingBusy}
              onClick={handleReanalyzeSupportingImages}
            >
              <Glyph name="sparkle" size={16} />
              {reanalyzing ? "جاري تحليل الصور…" : "إعادة تحليل الصور المضافة"}
            </button>
            <small>يقرأ أثري الصور مع الصياغة الحالية ويقترح تحديثًا للوصف والأثر ومؤشرات التميّز فقط. لا يستبدل أي نص تلقائيًا.</small>
          </div>
        ) : null}

        {reanalysisNote ? <Notice tone={reanalysisError ? "error" : "info"}>{reanalysisNote}</Notice> : null}

        {reanalysisProposal ? (
          <div className="rv-reanalysis-proposal">
            <div className="rv-reanalysis-head">
              <strong>مقترحات مستخرجة من الصور الداعمة</strong>
              <span>اختاري ما تريدين إضافته إلى الشاهد.</span>
            </div>
            {reanalysisProposal.draftDescription.trim() ? (
              <div className="rv-reanalysis-item">
                <div><b>وصف التنفيذ المقترح</b><p>{reanalysisProposal.draftDescription}</p></div>
                <button type="button" onClick={() => useReanalysisField("description")}>استخدام الوصف</button>
              </div>
            ) : null}
            {reanalysisProposal.draftImpact.trim() ? (
              <div className="rv-reanalysis-item">
                <div><b>الأثر المدعوم المقترح</b><p>{reanalysisProposal.draftImpact}</p></div>
                <button type="button" onClick={() => useReanalysisField("impact")}>استخدام الأثر</button>
              </div>
            ) : null}
            {(reanalysisProposal.draftHighlight ?? "").trim() ? (
              <div className="rv-reanalysis-item">
                <div><b>مؤشرات التميّز المقترحة</b><p className="rv-preline">{reanalysisProposal.draftHighlight}</p></div>
                <button type="button" onClick={() => useReanalysisField("highlight")}>استخدام المؤشرات</button>
              </div>
            ) : null}
          </div>
        ) : null}
      </Panel>

      {item.driveSource?.kind === "folder" ? (
        <Panel icon={<Glyph name="folder" size={22} />} title="مجلد Google Drive مرتبط" sub="يبقى المجلد خاصًا ولا يُشارك كاملًا مع رابط ملف الأداء.">
          <div className="ath-file-row">
            <span className="ic"><Glyph name="folder" size={18} /></span>
            <div className="nm"><strong>{item.driveSource.name}</strong><span>مصدر الشاهد في Google Drive</span></div>
            {item.driveSource.webViewLink ? (
              <a className="ath-icon-btn blue" href={item.driveSource.webViewLink} target="_blank" rel="noreferrer" aria-label={`فتح مجلد ${item.driveSource.name}`}>
                <Glyph name="external" size={17} />
              </a>
            ) : null}
          </div>
        </Panel>
      ) : null}

      <Panel icon={<Glyph name="sparkle" size={22} />} title="ما فهمه أثري من الشاهد" sub="من محتوى الشاهد">
        {analysis?.extractedFacts?.length ? (
          <ul className="ath-facts">
            {analysis.extractedFacts.map((fact, index) => (
              <li key={index}>
                <Glyph name="check" size={16} />
                <span>{fact.fact}{fact.support ? <small>{fact.support}</small> : null}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ath-fine" style={{ marginTop: 10 }}>لم تُستخرج حقائق بعد.</p>
        )}
        {analysis?.warnings?.length ? <div style={{ marginTop: 10 }}><Notice>{analysis.warnings.join(" ")}</Notice></div> : null}
      </Panel>

      <Panel icon={<Glyph name="bars" size={22} />} iconTone="blue" title="التصنيفات وبنود المتابعة" sub={`حتى ${MAX_CLASSIFICATIONS} عناصر`}>
        {suggestions.length ? (
          <div className="ath-stack">
            <p className="ath-fine">اختاري العنصر، ثم أكدي فقط بنود المتابعة التي يثبتها هذا الشاهد. اقتراح أثري لا يعتمد أي بند تلقائيًا.</p>
            {suggestions.map((suggestion) => {
              const isSelected = selectedIds.includes(suggestion.elementId);
              const isPrimary = isSelected && primaryId === suggestion.elementId;
              const requirements = requirementsForElement(suggestion.elementId);
              const selectedRequirements = requirementIdsByElement[suggestion.elementId] ?? [];
              const aiSuggested = new Set(suggestion.requirementIds ?? []);
              return (
                <div key={suggestion.elementId} className={`ath-choice ${isSelected ? "sel" : ""}`}>
                  <button type="button" className="main" onClick={() => toggleClassification(suggestion)} aria-pressed={isSelected}>
                    <ElementArt elementId={suggestion.elementId} className="art" />
                    <span className="tx"><strong>{suggestion.elementName}</strong><p>{suggestion.reason}</p></span>
                    <Glyph name={isSelected ? "check" : "empty"} size={24} />
                  </button>
                  {isSelected ? (
                    <>
                      <div className="foot">
                        <span className={`badge ${isPrimary ? "" : "alt"}`}>{isPrimary ? "التصنيف الأساسي" : "شاهد مشترك"}</span>
                        {!isPrimary ? <button type="button" className="ath-text-btn" onClick={() => setPrimaryId(suggestion.elementId)}>اجعليه الأساسي</button> : null}
                      </div>
                      {requirements.length ? (
                        <div style={{ padding: "6px 14px 14px" }}>
                          <strong style={{ display: "block", marginBottom: 8 }}>بنود المتابعة الإلزامية</strong>
                          <div className="ath-stack">
                            {requirements.map((requirement) => {
                              const checked = selectedRequirements.includes(requirement.id);
                              return (
                                <label key={requirement.id} style={{ display: "flex", gap: 9, alignItems: "flex-start", padding: "10px 0", cursor: "pointer", borderBottom: "1px solid rgba(0,0,0,.06)" }}>
                                  <input type="checkbox" checked={checked} onChange={() => toggleRequirement(suggestion.elementId, requirement.id)} style={{ marginTop: 4 }} />
                                  <span style={{ flex: 1 }}>
                                    <span>{requirement.label}</span>
                                    {aiSuggested.has(requirement.id) ? <small style={{ display: "block", marginTop: 3, opacity: .66 }}>متوافق مع محتوى الشاهد</small> : null}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                          <small className="ath-fine">تم تحديد {selectedRequirements.length} من {requirements.length} بنود لهذا الشاهد.</small>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="ath-fine" style={{ marginTop: 10 }}>لم يجد أثري تصنيفًا موثقًا مناسبًا لهذا الشاهد.</p>
        )}
      </Panel>

      <Panel icon={<Glyph name="docOutline" size={22} />} title="الصياغة المقترحة" sub="قابلة للتعديل">
        <div className="ath-field"><label htmlFor="ev-title">عنوان الشاهد</label><input id="ev-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div>
        <div className="ath-field"><label htmlFor="ev-desc">وصف التنفيذ</label><textarea id="ev-desc" value={description} onChange={(event) => setDescription(event.target.value)} /></div>
        <div className="ath-field"><label htmlFor="ev-impact">الأثر المدعوم</label><textarea id="ev-impact" value={impact} onChange={(event) => setImpact(event.target.value)} /></div>
        <div className="ath-field">
          <label htmlFor="ev-highlight" className="v7-inline">
            مؤشرات التميّز (اختياري)
            <InfoTip text="اكتبي فقط ما يثبت تميزا يتجاوز المتطلب الأساسي. يستهدف أثري حتى 5 مؤشرات عندما يدعمها الشاهد، ولا يضيف مؤشرات غير موثقة." />
          </label>
          <textarea id="ev-highlight" rows={6} maxLength={700} value={highlight} onChange={(event) => setHighlight(event.target.value)} placeholder={"مثال:\nأول تطبيق لهذه الاستراتيجية في مقررات الصف الأول الثانوي بالمدرسة.\nنُقلت التجربة لزميلات القسم عبر ورشة تطبيقية."} />
          <div className="rv-suggest">
            <button type="button" onClick={handleSuggestIndicators} disabled={suggesting} aria-busy={suggesting}>
              <Glyph name="star" size={15} />
              {suggesting ? "جاري الاقتراح…" : "اقترح مؤشرات التميّز"}
            </button>
            {indicatorNote ? <span role="status">{indicatorNote}</span> : null}
          </div>
        </div>
      </Panel>

      {analysis?.missingInformation ? (
        <section className="ath-question">
          <span className="ic"><Glyph name="alert" size={20} /></span>
          <div><small>معلومة تحتاج تأكيدك</small><h2>{analysis.missingInformation.question}</h2></div>
        </section>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="ath-sticky">
        <div className="v7-field-head"><strong>الاعتماد</strong><InfoTip text="بعد الاعتماد يدخل الشاهد في ملف الأداء وتُحتسب فقط بنود المتابعة التي أكدتِها." /></div>
        <button type="button" className="ath-btn primary block" onClick={approve} disabled={!canApprove || saving}>
          <Glyph name="check" />{saving ? "جاري الاعتماد…" : "اعتماد الشاهد"}
        </button>
      </div>
    </AthShell>
  );
}

export default function EvidenceReviewPage() {
  return (
    <Suspense fallback={<div className="ath"><div className="ath-frame"><div className="ath-notice">جاري التحميل…</div></div></div>}>
      <ReviewInner />
    </Suspense>
  );
}
