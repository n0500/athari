"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  AthShell,
  EvidenceThumb,
  Glyph,
  Notice,
  StatusTag,
  Tabs,
} from "@/components/athari-ui/Ui";
import { Scene } from "@/components/athari-ui/Art";
import { InfoTip } from "@/components/InfoTip";
import { getStoredDriveToken } from "@/lib/auth";
import { autoRefreshShare } from "@/lib/shareRefresh";
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

function fileSummary(item: EvidenceRecord) {
  const count = item.attachments?.length || item.fileCount || 1;
  if (count <= 1) return item.originalFileName;
  return count === 2 ? "ملفان أصليان" : count <= 10 ? `${count} ملفات أصلية` : `${count} ملفًا أصليًا`;
}

export default function EvidencePage() {
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState("");

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

  // Keep an active «مشاركة ملف الأداء» in step after a record leaves the file.
  async function afterRemoval(uid: string) {
    const note = await autoRefreshShare(uid, getStoredDriveToken());
    if (note) setNotice(note);
  }

  async function archive(item: EvidenceRecord) {
    if (
      !window.confirm(
        `أرشفة «${item.approvedContent?.title || item.originalFileName}»؟ يختفي الشاهد من الملف النشط ويمكن الرجوع إليه لاحقًا.`
      )
    ) return;

    try {
      setNotice("");
      await archiveEvidence(item.id);
      const user = requireAuth().currentUser;
      if (user) {
        await refresh(user.uid);
        if (item.status === "approved") await afterRemoval(user.uid);
      }
    } catch {
      setError("تعذرت أرشفة الشاهد الآن.");
    }
  }

  async function remove(item: EvidenceRecord) {
    const confirmation = `حذف سجل «${
      item.approvedContent?.title || item.originalFileName
    }» من أثري؟\n\nلا تُحذف الملفات الأصلية من Google Drive.`;

    if (!window.confirm(confirmation)) return;

    try {
      setNotice("");
      await deleteEvidenceRecord(item.id);
      const user = requireAuth().currentUser;
      if (user) {
        await refresh(user.uid);
        if (item.status === "approved") await afterRemoval(user.uid);
      }
    } catch {
      setError("تعذر حذف سجل الشاهد الآن.");
    }
  }

  function elementIdOf(item: EvidenceRecord) {
    const approved = item.approvedContent;
    return (
      approved?.classifications?.find((entry) => entry.isPrimary)?.elementId ??
      approved?.elementId ??
      item.aiAnalysis?.suggestedClassifications?.[0]?.elementId
    );
  }

  return (
    <AthShell title="الشواهد" subtitle="استعراض الشواهد وإدارتها.">
      <div className="ath-actions">
        <Link className="ath-btn primary fit" href="/evidence/new"><Glyph name="plus" />إضافة شاهد</Link>
      </div>

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        options={[
          { value: "all", label: "الكل", count: items.length },
          { value: "approved", label: "معتمد", count: approvedCount },
          { value: "attention", label: "يحتاج متابعة", count: attentionCount },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {loading ? <Notice>جاري تحميل الشواهد…</Notice> : null}

      <div className="ath-list">
        {filtered.map((item) => {
          const names = classificationNames(item);
          const href = `/evidence/review?id=${encodeURIComponent(item.id)}`;
          return (
            <article className="ath-item" key={item.id}>
              <div className="bd">
                <div className="head">
                  <StatusTag status={item.status} />
                  <span className="meta">{item.academicYear}</span>
                </div>
                <Link href={href}>
                  <h3>{item.approvedContent?.title || item.aiAnalysis?.draftTitle || item.originalFileName}</h3>
                </Link>
                <p className="meta">{names.length ? names.join(" · ") : "لم يُعتمد التصنيف بعد"}</p>
                <div className="ft">
                  <span className="files"><Glyph name="docOutline" size={14} />{fileSummary(item)}</span>
                  <div className="acts">
                    <Link className="ath-mini blue" href={href}>فتح<Glyph name="chevLeft" size={12} /></Link>
                    <span className="v7-inline">
                      <button type="button" className="ath-mini" onClick={() => archive(item)}>
                        <Glyph name="archive" size={15} />أرشفة
                      </button>
                      <InfoTip text="يختفي الشاهد من الملف النشط ويمكن الرجوع إليه لاحقًا." />
                    </span>
                    <button type="button" className="ath-mini danger" onClick={() => remove(item)} aria-label="حذف من أثري">
                      <Glyph name="trash" size={15} />حذف
                    </button>
                  </div>
                </div>
              </div>
              <Link className="th" href={href} tabIndex={-1} aria-hidden><EvidenceThumb elementId={elementIdOf(item)} /></Link>
            </article>
          );
        })}

        {!loading && !error && filtered.length === 0 ? (
          <div className="ath-panel ath-scene-card">
            <Scene kind="empty" />
            <strong>{filter === "all" ? "لا توجد شواهد نشطة" : "لا توجد شواهد في هذا القسم"}</strong>
          </div>
        ) : null}
      </div>

    </AthShell>
  );
}
