"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import {
  archiveEvidence,
  deleteEvidenceRecord,
  listUserEvidence,
} from "@/lib/firestore";
import { EvidenceRecord } from "@/types/athari";

function classificationNames(item: EvidenceRecord) {
  const approved = item.approvedContent;
  if (approved?.classifications?.length) {
    return approved.classifications.slice(0, 3).map((entry) => entry.elementName);
  }
  if (approved?.elementName) return [approved.elementName];
  return (
    item.aiAnalysis?.suggestedClassifications
      ?.slice(0, 3)
      .map((entry) => entry.elementName) ?? []
  );
}

function statusLabel(item: EvidenceRecord) {
  if (item.status === "approved") return "معتمد";
  if (item.status === "needs_info") return "يحتاج معلومة";
  if (item.status === "ready_for_review") return "جاهز للمراجعة";
  if (item.status === "analysis_failed") return "تعذر التحليل";
  if (item.status === "analyzing") return "قيد التحليل";
  if (item.status === "uploaded") return "تم الحفظ";
  return "قيد المتابعة";
}

function fileSummary(item: EvidenceRecord) {
  const count = item.attachments?.length || item.fileCount || 1;
  if (count <= 1) return item.originalFileName;
  return `${count} ملفات · ${item.originalFileName} + ${count - 1} أخرى`;
}

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");

  async function refresh(uid: string) {
    setItems(await listUserEvidence(uid));
  }

  useEffect(() => {
    if (!firebaseConfigured) {
      setLoading(false);
      return;
    }

    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        setError("");
        await refresh(user.uid);
      } catch {
        setError("تعذر تحميل الشواهد الآن.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  async function archive(item: EvidenceRecord) {
    if (
      !window.confirm(
        `أرشفة «${item.approvedContent?.title || item.originalFileName}» وإخفائه من القوائم؟`
      )
    ) {
      return;
    }

    try {
      await archiveEvidence(item.id);
      const user = requireAuth().currentUser;
      if (user) await refresh(user.uid);
    } catch {
      setError("تعذرت أرشفة الشاهد الآن.");
    }
  }

  async function remove(item: EvidenceRecord) {
    const confirmation = `حذف سجل «${
      item.approvedContent?.title || item.originalFileName
    }» من أثري؟\n\nلن تُحذف الملفات الأصلية من Google Drive.`;

    if (!window.confirm(confirmation)) return;

    try {
      await deleteEvidenceRecord(item.id);
      const user = requireAuth().currentUser;
      if (user) await refresh(user.uid);
    } catch {
      setError("تعذر حذف سجل الشاهد الآن.");
    }
  }

  return (
    <AppShell title="الشواهد" subtitle="الفهرس السريع في أثري">
      {error ? <div className="flow-message is-error">{error}</div> : null}
      {loading ? (
        <div className="setup-notice">جاري تحميل الشواهد…</div>
      ) : null}

      <div className="stack">
        {items.map((item) => {
          const names = classificationNames(item);

          return (
            <article className="evidence-card" key={item.id}>
              <Link
                href={`/evidence/review?id=${encodeURIComponent(item.id)}`}
              >
                <div className="evidence-card-head">
                  <span
                    className={`status-pill ${
                      item.status === "approved"
                        ? "status-approved"
                        : item.status === "needs_info" ||
                          item.status === "analysis_failed"
                        ? "status-needs-info"
                        : "status-ready"
                    }`}
                  >
                    {statusLabel(item)}
                  </span>
                  <span className="muted-small">{item.academicYear}</span>
                </div>

                <h3>
                  {item.approvedContent?.title ||
                    item.aiAnalysis?.draftTitle ||
                    item.originalFileName}
                </h3>
                <p>
                  {names.length ? names.join(" · ") : "لم يعتمد التصنيف بعد"}
                </p>
                <div className="file-row">
                  <Icon name="file" size={17} />
                  <span>{fileSummary(item)}</span>
                </div>
              </Link>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  style={{ minHeight: 42 }}
                  onClick={() => archive(item)}
                >
                  أرشفة
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  style={{ minHeight: 42 }}
                  onClick={() => remove(item)}
                >
                  حذف من أثري
                </button>
              </div>
            </article>
          );
        })}

        {!loading && !error && items.length === 0 ? (
          <div className="setup-notice">لا توجد شواهد نشطة الآن.</div>
        ) : null}
      </div>

      <Link
        className="floating-add"
        href="/evidence/new"
        aria-label="إضافة شاهد"
      >
        <Icon name="plus" size={25} />
      </Link>
    </AppShell>
  );
}
