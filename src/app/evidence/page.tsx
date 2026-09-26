"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { EvidenceRecord } from "@/types/athari";

function classificationNames(item: EvidenceRecord) {
  const approved = item.approvedContent;

  if (approved?.classifications?.length) {
    return approved.classifications
      .slice(0, 3)
      .map((entry) => entry.elementName);
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

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");

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
        setItems(await listUserEvidence(user.uid));
      } catch {
        setError("تعذر تحميل الشواهد الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

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
            <Link
              href={`/evidence/review?id=${encodeURIComponent(item.id)}`}
              className="evidence-card"
              key={item.id}
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
                {names.length
                  ? names.join(" · ")
                  : "لم يعتمد التصنيف بعد"}
              </p>

              <div className="file-row">
                <Icon name="file" size={17} />
                <span>{item.originalFileName}</span>
              </div>
            </Link>
          );
        })}

        {!loading && !error && items.length === 0 ? (
          <div className="setup-notice">
            لا توجد شواهد بعد. ابدئي بإضافة أول شاهد.
          </div>
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
