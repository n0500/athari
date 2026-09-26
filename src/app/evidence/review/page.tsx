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
  EvidenceRecord,
  SuggestedClassification,
} from "@/types/athari";

function ReviewInner() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id") ?? "";

  const [item, setItem] = useState<EvidenceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selected, setSelected] =
    useState<SuggestedClassification | null>(null);
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
        const suggestion =
          record?.aiAnalysis?.suggestedClassifications?.[0] ?? null;
        setSelected(suggestion);
        setTitle(record?.aiAnalysis?.draftTitle ?? "");
        setDescription(record?.aiAnalysis?.draftDescription ?? "");
        setImpact(record?.aiAnalysis?.draftImpact ?? "");
      })
      .catch(() => setError("تعذر تحميل الشاهد."))
      .finally(() => setLoading(false));
  }, [id]);

  const canApprove = useMemo(
    () => Boolean(item && selected && title.trim() && description.trim()),
    [item, selected, title, description]
  );

  async function approve() {
    if (!item || !selected || !canApprove) return;

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
        selected.elementName
      );

      if (item.driveFileId) {
        await moveDriveFile(
          token,
          item.driveFileId,
          item.driveParentFolderId,
          element.id
        );
      }

      const approved: ApprovedContent = {
        elementId: selected.elementId,
        elementName: selected.elementName,
        title: title.trim(),
        description: description.trim(),
        impact: impact.trim(),
      };

      await approveEvidence(id, approved, element.id);

      const all = await listUserEvidence(user.uid);
      await upsertAthariBackup(token, {
        format: "athari-backup-v1",
        exportedAt: new Date().toISOString(),
        evidence: all.map((e) => ({
          id: e.id,
          academicYear: e.academicYear,
          status: e.status,
          originalFileName: e.originalFileName,
          driveFileId: e.driveFileId,
          driveWebViewLink: e.driveWebViewLink,
          approvedContent: e.approvedContent,
        })),
      });

      router.push("/portfolio");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "UNKNOWN";
      setError(
        raw === "DRIVE_RECONNECT_REQUIRED"
          ? "انتهت جلسة Drive. اضغطي «اعتماد وترتيب في Drive» مرة أخرى لإعادة الربط تلقائيًا."
          : "تعذر الاعتماد الآن. الأصل لم يُحذف من Drive."
      );
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
        <div className="setup-notice">{error || "الشاهد غير موجود."}</div>
      </AppShell>
    );
  }

  const analysis = item.aiAnalysis;

  return (
    <AppShell title="مراجعة الشاهد" subtitle="القرار النهائي لك">
      <section className="original-file">
        <div className="file-preview-icon"><Icon name="file" size={25} /></div>
        <div>
          <span className="eyebrow">الأصل في Google Drive</span>
          <strong>{item.originalFileName}</strong>
          <p>يمكنك الرجوع إليه من حسابك في أي وقت.</p>
        </div>
        {item.driveWebViewLink ? (
          <a
            className="mini-button"
            href={item.driveWebViewLink}
            target="_blank"
            rel="noreferrer"
          >
            فتح
          </a>
        ) : null}
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
      </SectionCard>

      <SectionCard title="التصنيف المقترح" eyebrow="اقتراح قابل للتعديل">
        {analysis?.suggestedClassifications?.length ? (
          <div className="choice-list">
            {analysis.suggestedClassifications.map((suggestion) => (
              <button
                key={suggestion.elementId}
                className={`classification-choice ${
                  selected?.elementId === suggestion.elementId
                    ? "selected-choice"
                    : ""
                }`}
                onClick={() => setSelected(suggestion)}
              >
                <div>
                  <strong>{suggestion.elementName}</strong>
                  <p>{suggestion.reason}</p>
                </div>
                {selected?.elementId === suggestion.elementId ? (
                  <Icon name="check" size={20} />
                ) : null}
              </button>
            ))}
          </div>
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
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="field-label">وصف التنفيذ</label>
        <textarea
          className="text-area"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label className="field-label">الأثر المدعوم</label>
        <textarea
          className="text-area"
          value={impact}
          onChange={(e) => setImpact(e.target.value)}
        />
      </SectionCard>

      {analysis?.missingInformation ? (
        <section className="question-card">
          <div className="question-icon"><Icon name="alert" size={22} /></div>
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
