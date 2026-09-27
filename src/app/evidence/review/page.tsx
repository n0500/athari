"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AthShell, ElementArt, Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { InfoTip } from "@/components/InfoTip";
import { requireAuth } from "@/lib/firebase";
import { ensureDriveAccessToken } from "@/lib/auth";
import {
  ensureAthariElementFolder,
  moveDriveFile,
  upsertAthariBackup,
} from "@/lib/drive";
import {
  approveEvidence,
  getEvidence,
  listUserEvidence,
} from "@/lib/firestore";
import {
  ApprovedContent,
  EvidenceAttachment,
  EvidenceRecord,
  SuggestedClassification,
} from "@/types/athari";

const MAX_CLASSIFICATIONS = 3;

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;

  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.contentHash ? { contentHash: item.contentHash } : {}),
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink
        ? { driveWebViewLink: item.driveWebViewLink }
        : {}),
      ...(item.driveParentFolderId
        ? { driveParentFolderId: item.driveParentFolderId }
        : {}),
    },
  ];
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [impact, setImpact] = useState("");

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("لم يتم تحديد الشاهد.");
      return;
    }

    getEvidence(id)
      .then((record) => {
        setItem(record);

        const suggestions =
          record?.aiAnalysis?.suggestedClassifications?.slice(
            0,
            MAX_CLASSIFICATIONS
          ) ?? [];

        const approved = record?.approvedContent?.classifications ?? [];
        const approvedIds = approved
          .map((entry) => entry.elementId)
          .filter((elementId) =>
            suggestions.some(
              (suggestion) => suggestion.elementId === elementId
            )
          )
          .slice(0, MAX_CLASSIFICATIONS);

        if (approvedIds.length) {
          setSelectedIds(approvedIds);
          setPrimaryId(
            approved.find((entry) => entry.isPrimary)?.elementId ??
              approvedIds[0]
          );
        } else if (suggestions[0]) {
          setSelectedIds([suggestions[0].elementId]);
          setPrimaryId(suggestions[0].elementId);
        }

        setTitle(
          record?.approvedContent?.title ??
            record?.aiAnalysis?.draftTitle ??
            ""
        );
        setDescription(
          record?.approvedContent?.description ??
            record?.aiAnalysis?.draftDescription ??
            ""
        );
        setImpact(
          record?.approvedContent?.impact ??
            record?.aiAnalysis?.draftImpact ??
            ""
        );
      })
      .catch(() => setError("تعذر تحميل الشاهد."))
      .finally(() => setLoading(false));
  }, [id]);

  const suggestions = useMemo(
    () =>
      item?.aiAnalysis?.suggestedClassifications?.slice(
        0,
        MAX_CLASSIFICATIONS
      ) ?? [],
    [item]
  );

  const selectedClassifications = useMemo(
    () =>
      suggestions.filter((suggestion) =>
        selectedIds.includes(suggestion.elementId)
      ),
    [suggestions, selectedIds]
  );

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
        const next = current.filter(
          (elementId) => elementId !== suggestion.elementId
        );

        if (primaryId === suggestion.elementId) {
          setPrimaryId(next[0] ?? "");
        }

        return next;
      }

      if (current.length >= MAX_CLASSIFICATIONS) return current;

      const next = [...current, suggestion.elementId];
      if (!primaryId) setPrimaryId(suggestion.elementId);
      return next;
    });
  }

  async function approve() {
    if (!item || !selectedClassifications.length || !canApprove) return;

    const primary =
      selectedClassifications.find(
        (suggestion) => suggestion.elementId === primaryId
      ) ?? selectedClassifications[0];

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

      const token = await ensureDriveAccessToken();
      const { element } = await ensureAthariElementFolder(
        token,
        item.academicYear,
        primary.elementName
      );

      const originals = attachmentsFor(item);
      for (const attachment of originals) {
        if (!attachment.driveFileId) continue;
        await moveDriveFile(
          token,
          attachment.driveFileId,
          attachment.driveParentFolderId,
          element.id
        );
      }

      stage = "firestore";

      const approved: ApprovedContent = {
        elementId: primary.elementId,
        elementName: primary.elementName,
        classifications: ordered.map((suggestion) => ({
          elementId: suggestion.elementId,
          elementName: suggestion.elementName,
          reason: suggestion.reason,
          isPrimary: suggestion.elementId === primary.elementId,
        })),
        title: title.trim(),
        description: description.trim(),
        impact: impact.trim(),
      };

      await approveEvidence(id, approved, element.id);
      stage = "backup";

      try {
        const all = await listUserEvidence(user.uid);
        await upsertAthariBackup(token, {
          format: "athari-backup-v3",
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
            approvedContent: entry.approvedContent,
          })),
        });
      } catch {
        // Approval is already committed; backup can be refreshed later.
      }

      router.push("/portfolio?added=1");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";

      if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setError(
          "انتهت جلسة Google Drive. اضغطي «اعتماد الشاهد» مرة أخرى لإعادة الربط."
        );
      } else if (stage === "drive") {
        setError(
          "تعذر ترتيب أحد ملفات الشاهد في Drive الآن. لم يُحذف أي أصل؛ أعيدي المحاولة."
        );
      } else if (stage === "firestore") {
        setError(
          "تم ترتيب الأصول في Drive، لكن تعذر حفظ الاعتماد في أثري. أعيدي المحاولة؛ لن تتكرر الملفات."
        );
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

  return (
    <AthShell back={back} title="مراجعة الشاهد" subtitle="مراجعة البيانات والتصنيف قبل الاعتماد.">

      <div className="ath-steps" aria-label="مراحل إضافة الشاهد">
        <span className="on"><b>1</b>اختيار</span>
        <span className="on"><b>2</b>تحليل</span>
        <span className="on"><b>3</b>مراجعة</span>
      </div>

      <Panel
        icon={<Glyph name="folder" size={22} />}
        title={originals.length === 1 ? "ملف واحد لهذا الشاهد" : originals.length === 2 ? "ملفان لهذا الشاهد" : `${originals.length} ملفات لهذا الشاهد`}
        sub="الأصول محفوظة في Google Drive"
      >
        <div className="ath-stack">
          {originals.map((attachment, index) => (
            <div className="ath-file-row" key={`${attachment.originalFileName}-${index}`}>
              <span className="ic"><Glyph name="docOutline" size={18} /></span>
              <div className="nm"><strong>{attachment.originalFileName}</strong></div>
              {attachment.driveWebViewLink ? (
                <a className="ath-icon-btn blue" href={attachment.driveWebViewLink} target="_blank" rel="noreferrer" aria-label={`فتح ${attachment.originalFileName}`}>
                  <Glyph name="external" size={17} />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </Panel>

      <Panel icon={<Glyph name="sparkle" size={22} />} title="ما فهمه أثري من الشاهد" sub="من محتوى الشاهد">
        {analysis?.extractedFacts?.length ? (
          <ul className="ath-facts">
            {analysis.extractedFacts.map((fact, index) => (
              <li key={index}>
                <Glyph name="check" size={16} />
                <span>
                  {fact.fact}
                  {fact.support ? <small>{fact.support}</small> : null}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="ath-fine" style={{ marginTop: 10 }}>لم تُستخرج حقائق بعد.</p>
        )}
        {analysis?.warnings?.length ? (
          <div style={{ marginTop: 10 }}><Notice>{analysis.warnings.join(" ")}</Notice></div>
        ) : null}
      </Panel>

      <Panel icon={<Glyph name="bars" size={22} />} iconTone="blue" title="التصنيفات المقترحة" sub={`حتى ${MAX_CLASSIFICATIONS} عناصر`}>
        {suggestions.length ? (
          <div className="ath-stack">
            <p className="ath-fine">
              التصنيف الأساسي يحدد مجلد الشاهد، ويمكن إضافة تصنيفات مشتركة.
            </p>
            {suggestions.map((suggestion) => {
              const isSelected = selectedIds.includes(suggestion.elementId);
              const isPrimary = isSelected && primaryId === suggestion.elementId;
              return (
                <div key={suggestion.elementId} className={`ath-choice ${isSelected ? "sel" : ""}`}>
                  <button type="button" className="main" onClick={() => toggleClassification(suggestion)} aria-pressed={isSelected}>
                    <ElementArt elementId={suggestion.elementId} className="art" />
                    <span className="tx">
                      <strong>{suggestion.elementName}</strong>
                      <p>{suggestion.reason}</p>
                    </span>
                    <Glyph name={isSelected ? "check" : "empty"} size={24} />
                  </button>
                  {isSelected ? (
                    <div className="foot">
                      <span className={`badge ${isPrimary ? "" : "alt"}`}>{isPrimary ? "التصنيف الأساسي" : "شاهد مشترك"}</span>
                      {!isPrimary ? (
                        <button type="button" className="ath-text-btn" onClick={() => setPrimaryId(suggestion.elementId)}>
                          اجعليه الأساسي
                        </button>
                      ) : null}
                    </div>
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
        <div className="ath-field">
          <label htmlFor="ev-title">عنوان الشاهد</label>
          <input id="ev-title" value={title} onChange={(event) => setTitle(event.target.value)} />
        </div>
        <div className="ath-field">
          <label htmlFor="ev-desc">وصف التنفيذ</label>
          <textarea id="ev-desc" value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <div className="ath-field">
          <label htmlFor="ev-impact">الأثر المدعوم</label>
          <textarea id="ev-impact" value={impact} onChange={(event) => setImpact(event.target.value)} />
        </div>
      </Panel>

      {analysis?.missingInformation ? (
        <section className="ath-question">
          <span className="ic"><Glyph name="alert" size={20} /></span>
          <div>
            <small>معلومة تحتاج تأكيدك</small>
            <h2>{analysis.missingInformation.question}</h2>
          </div>
        </section>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="ath-sticky">
        <div className="v7-field-head">
          <strong>الاعتماد</strong>
          <InfoTip text="بعد الاعتماد يدخل الشاهد في ملف الأداء." />
        </div>
        <button type="button" className="ath-btn primary block" onClick={approve} disabled={!canApprove || saving}>
          <Glyph name="check" />
          {saving ? "جاري الاعتماد…" : "اعتماد الشاهد"}
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
