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
  Panel,
  PortfolioHero,
  SectionHead,
  StatStrip,
} from "@/components/athari-ui/Ui";
import { ProfessionalIdentityCard } from "@/components/ProfessionalIdentityCard";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { getProfessionalProfile } from "@/lib/professionalProfile";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import {
  MANDATORY_REQUIREMENT_COUNT,
  requirementsForElement,
} from "@/data/mandatory-requirements";
import { ApprovedClassification, EvidenceRecord, ProfessionalProfile } from "@/types/athari";

function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];
  if (approved.classifications?.length) return approved.classifications.slice(0, 3);
  if (approved.elementId && approved.elementName) {
    return [{ elementId: approved.elementId, elementName: approved.elementName, isPrimary: true, requirementIds: [] }];
  }
  return [];
}

export default function PreviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [professionalProfile, setProfessionalProfile] = useState<ProfessionalProfile | null>(null);

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      setOwnerName(user.displayName?.trim() || "");
      try {
        setError("");
        const [all, profile] = await Promise.all([
          listUserEvidence(user.uid),
          getProfessionalProfile(user.uid).catch(() => null),
        ]);
        setItems(all.filter((item) => item.status === "approved"));
        setProfessionalProfile(profile);
      } catch {
        setError("تعذر تحميل ملف الأداء الآن. حاولي تحديث الصفحة.");
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

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

  const completedRequirementIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      for (const classification of classificationsFor(item)) {
        classification.requirementIds?.forEach((id) => set.add(id));
      }
    }
    return set;
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

  const displayName = professionalProfile?.fullName || ownerName;

  return (
    <AthShell title="معاينة ملف الأداء" subtitle="معاينة الملف قبل الطباعة أو المشاركة." showNav={false}>
      <div className="ath-actions no-print">
        <button type="button" className="ath-btn outline fit" onClick={() => router.push("/portfolio")}>
          رجوع إلى ملف الأداء <Glyph name="chevLeft" size={16} />
        </button>
      </div>

      <PortfolioHero
        year={year}
        name={displayName}
        evidenceCount={items.length}
        covered={covered}
        total={total}
        loading={loading}
        browse={{ onClick: () => document.getElementById("approved-evidence")?.scrollIntoView({ behavior: "smooth" }) }}
        print={{ onClick: () => window.print() }}
      />

      <ProfessionalIdentityCard profile={professionalProfile} fallbackName={ownerName} />

      <StatStrip
        first={{ title: "صفحة للعرض فقط", sub: "لا يمكن التعديل على المحتوى" }}
        evidenceCount={items.length}
        covered={covered}
        total={total}
      />

      <Panel
        icon={<Glyph name="bars" size={22} />}
        title="اكتمال بنود المتابعة الإلزامية"
        sub={`${completedRequirementIds.size} من ${MANDATORY_REQUIREMENT_COUNT} بندًا موثقًا`}
      >
        <p className="ath-fine">يُحتسب البند عندما يكون مرتبطًا بشاهد معتمد ومؤكد من المعلمة.</p>
      </Panel>

      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="no-print">
        <SectionHead icon={<Glyph name="bars" />} title="عناصر التقييم" side={<CountChip total={total} />} />
        <ElementGrid elements={elements} tapFor={(id) => ({ href: `/element?id=${encodeURIComponent(id)}` })} />

        <div id="approved-evidence">
          <SectionHead
            icon={<Glyph name="doc" className="ath-green-ico" />}
            title="الشواهد المعتمدة"
            sub={loading ? "جاري التحميل…" : items.length ? `${items.length} ${items.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}` : "لا توجد شواهد معتمدة بعد."}
          />
        </div>
        {tiles.length ? <EvidenceTiles items={tiles} /> : null}
      </div>

      <section className="ath-print-only">
        <h2 className="ath-print-title">عناصر التقييم وبنود المتابعة وشواهدها</h2>
        {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => {
          const evidence = items.filter((item) =>
            classificationsFor(item).some((entry) => entry.elementId === element.id)
          );
          const completed = new Set<string>();
          evidence.forEach((item) =>
            classificationsFor(item)
              .find((entry) => entry.elementId === element.id)
              ?.requirementIds?.forEach((id) => completed.add(id))
          );
          const requirements = requirementsForElement(element.id);
          return (
            <div className="ath-print-el" key={element.id}>
              <h2>
                {index + 1}. {element.officialName}
                <span className={evidence.length ? "ok" : "no"}>
                  {evidence.length ? `${evidence.length} ${evidence.length === 1 ? "شاهد معتمد" : evidence.length === 2 ? "شاهدان معتمدان" : "شواهد معتمدة"}` : "غير مغطى"}
                </span>
              </h2>
              {requirements.length ? (
                <div className="ath-print-ev">
                  <strong>بنود المتابعة: {completed.size} من {requirements.length}</strong>
                  <ul>
                    {requirements.map((requirement) => (
                      <li key={requirement.id}>{completed.has(requirement.id) ? "✓" : "○"} {requirement.label}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
