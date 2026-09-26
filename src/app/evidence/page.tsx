"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Filter = "all" | "approved" | "attention";

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
  return `${count} ملفات أصلية`;
}

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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

  const filtered = useMemo(() => {
    if (filter === "approved") return items.filter((item) => item.status === "approved");
    if (filter === "attention") {
      return items.filter((item) =>
        ["needs_info", "ready_for_review", "analysis_failed"].includes(item.status)
      );
    }
    return items;
  }, [items, filter]);

  const approvedCount = items.filter((item) => item.status === "approved").length;
  const attentionCount = items.filter((item) =>
    ["needs_info", "ready_for_review", "analysis_failed"].includes(item.status)
  ).length;

  async function archive(item: EvidenceRecord) {
    if (
      !window.confirm(
        `أرشفة «${item.approvedContent?.title || item.originalFileName}» وإخفائه من القوائم؟`
      )
    ) return;

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
    <AppShell title="الشواهد" subtitle="كل الشواهد في مكان واحد">
      <section className="evidence-overview">
        <div>
          <span className="eyebrow light">الفهرس الذكي</span>
          <h1>راجعي، اعتمدي، أو ارجعي لأي شاهد.</h1>
        </div>
        <Link className="button-on-dark" href="/evidence/new">
          <Icon name="plus" size={19} />
          إضافة شاهد
        </Link>
      </section>

      <div className="segment-control modern-segments">
        <button className={`segment ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          الكل <b>{items.length}</b>
        </button>
        <button className={`segment ${filter === "approved" ? "active" : ""}`} onClick={() => setFilter("approved")}>
          معتمد <b>{approvedCount}</b>
        </button>
        <button className={`segment ${filter === "attention" ? "active" : ""}`} onClick={() => setFilter("attention")}>
          يحتاج متابعة <b>{attentionCount}</b>
        </button>
      </div>

      {error ? <div className="flow-message is-error">{error}</div> : null}
      {loading ? <div className="setup-notice">جاري تحميل الشواهد…</div> : null}

      <div className="stack evidence-stack">
        {filtered.map((item) => {
          const names = classificationNames(item);
          const isApproved = item.status === "approved";

          return (
            <article className="evidence-card premium-evidence" key={item.id}>
              <Link href={`/evidence/review?id=${encodeURIComponent(item.id)}`} className="evidence-main-link">
                <div className="evidence-card-head">
                  <span
                    className={`status-pill ${
                      isApproved
                        ? "status-approved"
                        : item.status === "needs_info" || item.status === "analysis_failed"
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

                <p className="classification-line">
                  {names.length ? names.join(" · ") : "لم يعتمد التصنيف بعد"}
                </p>

                <div className="evidence-footer-row">
                  <span><Icon name="file" size={15} /> {fileSummary(item)}</span>
                  <span className="open-hint">فتح <Icon name="chevron" size={15} /></span>
                </div>
              </Link>

              <div className="evidence-actions-row">
                <button type="button" className="quiet-action" onClick={() => archive(item)}>
                  <Icon name="archive" size={16} /> أرشفة
                </button>
                <button type="button" className="quiet-action danger" onClick={() => remove(item)}>
                  <Icon name="trash" size={16} /> حذف من أثري
                </button>
              </div>
            </article>
          );
        })}

        {!loading && !error && filtered.length === 0 ? (
          <div className="empty-state polished-empty">
            <span><Icon name="file" size={26} /></span>
            <strong>{filter === "all" ? "لا توجد شواهد نشطة" : "لا توجد شواهد في هذا القسم"}</strong>
            <p>ابدئي بإضافة شاهد، وسيظهر هنا تلقائيًا بعد الحفظ.</p>
          </div>
        ) : null}
      </div>

      <Link className="floating-add" href="/evidence/new" aria-label="إضافة شاهد">
        <Icon name="plus" size={25} />
      </Link>
    </AppShell>
  );
}
