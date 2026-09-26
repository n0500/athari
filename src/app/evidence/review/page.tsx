"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { Icon } from "@/components/Icon";
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

      router.push("/portfolio");
    } catch (caught) {
      const raw = caught instanceof Error ? caught.message : "UNKNOWN";

      if (raw === "DRIVE_RECONNECT_REQUIRED") {
        setError(
          "انتهت جلسة Drive. اضغطي «اعتماد وترتيب في Drive» مرة أخرى لإعادة الربط تلقائيًا."
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

  if (loading) {
    return (
      <AppShell title="مراجعة الشاهد">
        <div className="setup-notice">جاري تحميل التحليل…</div>
      </AppShell>
    );
  }

  if (!item) {
    return (
      <AppShell title="مراجعة الشاهد">
        <div className="setup-notice">
          {error || "الشاهد غير موجود."}
        </div>
      </AppShell>
    );
  }

  const analysis = item.aiAnalysis;
  const originals = attachmentsFor(item);

  return (
    <AppShell title="مراجعة الشاهد" subtitle="القرار النهائي لك">
      <section className="section-card" style={{ marginTop: 0 }}>
        <span className="eyebrow">الأصول في Google Drive</span>
        <h2>
          {originals.length === 1
            ? "ملف واحد لهذا الشاهد"
            : `${originals.length} ملفات لهذا الشاهد`}
        </h2>
        <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          {originals.map((attachment, index) => (
            <div
              key={`${attachment.originalFileName}-${index}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "10px 11px",
                border: "1px solid #e5ebe6",
                borderRadius: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <strong
                  style={{
                    display: "block",
                    fontSize: 12,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {attachment.originalFileName}
                </strong>
              </div>
              {attachment.driveWebViewLink ? (
                <a
                  className="mini-button"
                  href={attachment.driveWebViewLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  فتح
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      <SectionCard title="ما فهمه أثري من الشاهد" eyebrow="حقائق فقط">
        {analysis?.extractedFacts?.length ? (
          <ul className="facts-list">
            {analysis.extractedFacts.map((fact, index) => (
              <li key={index}>
                {fact.fact}
                {fact.support ? <small> — {fact.support}</small> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">لم تُستخرج حقائق بعد.</p>
        )}

        {analysis?.warnings?.length ? (
          <div className="flow-message" style={{ marginTop: 12 }}>
            {analysis.warnings.join(" ")}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="التصنيفات المقترحة" eyebrow="اختاري حتى 3 عناصر">
        {suggestions.length ? (
          <>
            <p className="classification-help">
              التصنيف الأقوى محدد كأساسي. يمكنك إضافة تصنيفات أخرى إذا
              كان الشاهد يدعمها، وستنتقل جميع ملفات الشاهد إلى مجلد التصنيف
              الأساسي دون تكرارها.
            </p>

            <div className="choice-list">
              {suggestions.map((suggestion) => {
                const isSelected = selectedIds.includes(
                  suggestion.elementId
                );
                const isPrimary =
                  isSelected && primaryId === suggestion.elementId;

                return (
                  <div
                    key={suggestion.elementId}
                    className={`classification-choice ${
                      isSelected ? "selected-choice" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="classification-main"
                      onClick={() => toggleClassification(suggestion)}
                    >
                      <div>
                        <strong>{suggestion.elementName}</strong>
                        <p>{suggestion.reason}</p>
                      </div>
                      {isSelected ? <Icon name="check" size={20} /> : null}
                    </button>

                    {isSelected ? (
                      <div className="classification-footer">
                        <span className="classification-badge">
                          {isPrimary ? "التصنيف الأساسي" : "شاهد مشترك"}
                        </span>
                        {!isPrimary ? (
                          <button
                            type="button"
                            className="text-action"
                            onClick={() =>
                              setPrimaryId(suggestion.elementId)
                            }
                          >
                            اجعليه الأساسي
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="muted-copy">
            لم يجد أثري تصنيفًا موثقًا مناسبًا لهذا الشاهد.
          </p>
        )}
      </SectionCard>

      <SectionCard title="الصياغة المقترحة" eyebrow="عدلي قبل الاعتماد">
        <label className="field-label">عنوان الشاهد</label>
        <input
          className="text-input"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />

        <label className="field-label">وصف التنفيذ</label>
        <textarea
          className="text-area"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label className="field-label">الأثر المدعوم</label>
        <textarea
          className="text-area"
          value={impact}
          onChange={(event) => setImpact(event.target.value)}
        />
      </SectionCard>

      {analysis?.missingInformation ? (
        <section className="question-card">
          <div className="question-icon">
            <Icon name="alert" size={22} />
          </div>
          <div>
            <span className="eyebrow">معلومة تحتاج تأكيدك</span>
            <h2>{analysis.missingInformation.question}</h2>
          </div>
        </section>
      ) : null}

      {error ? <div className="flow-message is-error">{error}</div> : null}

      <div className="review-actions">
        <button
          className="primary-button full-button"
          onClick={approve}
          disabled={!canApprove || saving}
        >
          <Icon name="check" size={20} />
          {saving ? "جاري الاعتماد…" : "اعتماد وترتيب في Drive"}
        </button>
      </div>
    </AppShell>
  );
}

export default function EvidenceReviewPage() {
  return (
    <Suspense fallback={<div className="setup-notice">جاري التحميل…</div>}>
      <ReviewInner />
    </Suspense>
  );
}
