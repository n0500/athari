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

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!firebaseConfigured) return;

    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }
      try {
        setItems(await listUserEvidence(user.uid));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  return (
    <AppShell title="الشواهد" subtitle="الفهرس السريع في أثري">
      {!firebaseConfigured ? (
        <div className="setup-notice">
          يلزم ربط Firebase لإظهار الشواهد الحقيقية.
        </div>
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
                <span className="status-pill status-ready">
                  {item.status === "approved"
                    ? "معتمد"
                    : item.status === "needs_info"
                    ? "يحتاج معلومة"
                    : item.status === "analysis_failed"
                    ? "تعذر التحليل"
                    : "قيد المتابعة"}
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

        {!loading && firebaseConfigured && items.length === 0 ? (
          <div className="setup-notice">
            ابدئي بأول شاهد، وسيظهر هنا بعد حفظه في Drive.
          </div>
        ) : null}
      </div>

      <Link className="floating-add" href="/evidence/new" aria-label="إضافة شاهد">
        <Icon name="plus" size={25} />
      </Link>
    </AppShell>
  );
}
