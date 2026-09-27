"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import {
  AthShell,
  CountChip,
  ElementGrid,
  EvidenceTiles,
  Glyph,
  Notice,
  PortfolioHero,
  SectionHead,
  StatStrip,
} from "@/components/athari-ui/Ui";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ApprovedClassification, EvidenceRecord } from "@/types/athari";

function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];
  if (approved.classifications?.length) return approved.classifications.slice(0, 3);
  if (approved.elementId && approved.elementName) {
    return [{ elementId: approved.elementId, elementName: approved.elementName, isPrimary: true }];
  }
  return [];
}

export default function PreviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerName, setOwnerName] = useState("");

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setOwnerName(user.displayName?.trim() || "");
      try {
        setError("");
        const all = await listUserEvidence(user.uid);
        setItems(all.filter((item) => item.status === "approved"));
      } catch {
        setError("تعذر تحميل ملف الأداء الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  // Opening this page with ?print=1 starts printing once the data is loaded.
  useEffect(() => {
    if (loading) return;
    if (new URLSearchParams(window.location.search).get("print") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [loading]);

  const countByElement = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const item of items) {
      for (const classification of classificationsFor(item)) {
        const set = map.get(classification.elementId) ?? new Set<string>();
        set.add(item.id);
        map.set(classification.elementId, set);
      }
    }
    return map;
  }, [items]);

  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const covered = OFFICIAL_TEACHER_FRAMEWORK_V2.filter((element) => (countByElement.get(element.id)?.size ?? 0) > 0).length;
  const year = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  const elements = OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => ({
    id: element.id,
    name: element.officialName,
    count: countByElement.get(element.id)?.size ?? 0,
  }));

  const tiles = items.map((item) => {
    const list = classificationsFor(item);
    const primary = list.find((entry) => entry.isPrimary) ?? list[0];
    return {
      id: item.id,
      title: item.approvedContent?.title || item.originalFileName,
      description: item.approvedContent?.description || "",
      elementId: primary?.elementId,
      elementName: primary?.elementName,
      view: { href: `/evidence/review?id=${encodeURIComponent(item.id)}` },
    };
  });

  return (
    <AthShell title="معاينة ملف الأداء" subtitle="معاينة الملف قبل الطباعة أو المشاركة." showNav={false}>
      <div className="ath-actions no-print">
        <button type="button" className="ath-btn outline fit" onClick={() => router.push("/portfolio")}>
          رجوع إلى ملف الأداء <Glyph name="chevLeft" size={16} />
        </button>
      </div>

      <PortfolioHero
        year={year}
        name={ownerName}
        evidenceCount={items.length}
        covered={covered}
        total={total}
        loading={loading}
        browse={{ onClick: () => document.getElementById("approved-evidence")?.scrollIntoView({ behavior: "smooth" }) }}
        print={{ onClick: () => window.print() }}
      />

      <StatStrip
        first={{ title: "صفحة للعرض فقط", sub: "لا يمكن التعديل على المحتوى" }}
        evidenceCount={items.length}
        covered={covered}
        total={total}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="no-print">
      <SectionHead
        icon={<Glyph name="bars" />}
        title="عناصر التقييم"
        side={<CountChip total={total} />}
      />
      <ElementGrid
        elements={elements}
        tapFor={(id) => ({ href: `/element?id=${encodeURIComponent(id)}` })}
      />

      <div id="approved-evidence">
        <SectionHead
          icon={<Glyph name="doc" className="ath-green-ico" />}
          title="الشواهد المعتمدة"
          sub={
            loading
              ? "جاري التحميل…"
              : items.length
                ? `${items.length} ${items.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}`
                : "لا توجد شواهد معتمدة بعد."
          }
        />
      </div>
      {tiles.length ? <EvidenceTiles items={tiles} /> : null}
      </div>

      {/* Printed/PDF copy: the coverage summary above, then every element with only its own evidence. */}
      <section className="ath-print-only">
        <h2 className="ath-print-title">عناصر التقييم وشواهدها</h2>
        {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => {
          const evidence = items.filter((item) =>
            classificationsFor(item).some((entry) => entry.elementId === element.id)
          );
          return (
            <div className="ath-print-el" key={element.id}>
              <h2>
                {index + 1}. {element.officialName}
                <span className={evidence.length ? "ok" : "no"}>
                  {evidence.length ? `${evidence.length} ${evidence.length === 1 ? "شاهد معتمد" : evidence.length === 2 ? "شاهدان معتمدان" : "شواهد معتمدة"}` : "غير مغطى"}
                </span>
              </h2>
              {evidence.map((item) => (
                <div className="ath-print-ev" key={`${element.id}-${item.id}`}>
                  <h3>{item.approvedContent?.title || item.originalFileName}</h3>
                  {item.approvedContent?.description ? <p>{item.approvedContent.description}</p> : null}
                  {item.approvedContent?.impact ? <p><strong>الأثر: </strong>{item.approvedContent.impact}</p> : null}
                </div>
              ))}
            </div>
          );
        })}
      </section>
    </AthShell>
  );
}
