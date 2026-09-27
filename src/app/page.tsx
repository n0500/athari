"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  ActionTile,
  AthShell,
  CoverageRing,
  EvidenceThumb,
  EvidenceTiles,
  Glyph,
  MiniStats,
  Notice,
  PageHero,
  SectionHead,
  StatusTag,
} from "@/components/athari-ui/Ui";
import { firebaseConfigured, requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { EvidenceRecord } from "@/types/athari";

function coveredIds(items: EvidenceRecord[]) {
  const ids = new Set<string>();
  for (const item of items) {
    const approved = item.approvedContent;
    if (!approved) continue;
    if (approved.classifications?.length) {
      approved.classifications.forEach((entry) => ids.add(entry.elementId));
    } else if (approved.elementId) {
      ids.add(approved.elementId);
    }
  }
  return ids;
}

export default function HomePage() {
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
        setError("تعذر تحميل بيانات ملفك الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const approved = useMemo(
    () => items.filter((item) => item.status === "approved"),
    [items]
  );

  const attention = useMemo(
    () =>
      items.filter((item) =>
        ["needs_info", "ready_for_review", "analysis_failed"].includes(
          item.status
        )
      ),
    [items]
  );

  const covered = useMemo(() => coveredIds(approved), [approved]);
  const totalElements = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const coverage = totalElements
    ? Math.round((covered.size / totalElements) * 100)
    : 0;

  const recent = approved.slice(0, 2);
  const [name, setName] = useState("");

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(requireAuth(), (user) => {
      setName(user?.displayName?.trim().split(/\s+/)[0] ?? "");
    });
  }, []);

  function primaryOf(item: EvidenceRecord) {
    const approvedContent = item.approvedContent;
    const primary =
      approvedContent?.classifications?.find((entry) => entry.isPrimary) ??
      approvedContent?.classifications?.[0];
    return {
      elementId: primary?.elementId ?? approvedContent?.elementId,
      elementName: primary?.elementName ?? approvedContent?.elementName,
    };
  }

  return (
    <AthShell title="ملف الأداء المهني" subtitle="ملخص الشواهد وتغطية عناصر التقييم.">
      <PageHero
        title="تغطية عناصر التقييم"
        sub={loading ? "…" : `${approved.length} ${approved.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"} · ${covered.size} من ${totalElements} عناصر مغطاة`}
        side={<CoverageRing percent={coverage} loading={loading} />}
        actions={
          <>
            <Link className="ath-btn primary" href="/evidence/new"><Glyph name="plus" />إضافة شاهد</Link>
            <Link className="ath-btn white" href="/preview"><Glyph name="eye" />معاينة ملف الأداء</Link>
          </>
        }
      />

      <MiniStats
        stats={[
          { value: loading ? "…" : approved.length, label: "شواهد معتمدة", tone: "s2", icon: "doc" },
          { value: loading ? "…" : `${covered.size} من ${totalElements}`, label: "عناصر مغطاة", tone: "s3", icon: "folder" },
          { value: loading ? "…" : attention.length, label: "تحتاج مراجعة", tone: "s4", icon: "clock" },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <SectionHead icon={<Glyph name="sparkle" className="ath-green-ico" />} title="اختصارات" />
      <div className="ath-tile-grid">
        <ActionTile href="/evidence/new" title="إضافة شاهد" sub="ملف أو أكثر" elementArt="planner" tone="sky" />
        <ActionTile href="/preview" title="معاينة ملف الأداء" sub="قبل الطباعة أو المشاركة" elementArt="report" tone="lav" />
        <ActionTile href="/portfolio" title="ملف الأداء" sub="عناصر التقييم والشواهد" elementArt="clipboard" tone="mint" />
      </div>

      <SectionHead
        icon={<Glyph name="clock" className="ath-amber-ico" />}
        title={attention.length ? "شواهد تحتاج مراجعة" : "لا توجد شواهد تحتاج مراجعة"}
        side={<Link className="ath-link-btn" href="/evidence">عرض الشواهد <Glyph name="chevLeft" size={14} /></Link>}
      />
      {attention.length ? (
        <div className="ath-list">
          {attention.slice(0, 3).map((item) => {
            const suggestion = item.aiAnalysis?.suggestedClassifications?.[0];
            return (
              <Link className="ath-item" href={`/evidence/review?id=${encodeURIComponent(item.id)}`} key={item.id}>
                <div className="bd">
                  <div className="head"><StatusTag status={item.status} /><Glyph name="chevLeft" size={14} /></div>
                  <h3>{item.aiAnalysis?.draftTitle || item.originalFileName}</h3>
                  {suggestion ? <p className="meta">التصنيف المقترح: {suggestion.elementName}</p> : null}
                </div>
                <div className="th"><EvidenceThumb elementId={suggestion?.elementId} /></div>
              </Link>
            );
          })}
        </div>
      ) : null}

      {recent.length ? (
        <>
          <SectionHead icon={<Glyph name="doc" className="ath-green-ico" />} title="آخر الشواهد المعتمدة" />
          <EvidenceTiles
            items={recent.map((item) => ({
              id: item.id,
              title: item.approvedContent?.title || item.originalFileName,
              description: item.approvedContent?.description || "",
              ...primaryOf(item),
              view: { href: `/evidence/review?id=${encodeURIComponent(item.id)}` },
            }))}
          />
        </>
      ) : null}
    </AthShell>
  );
}
