"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Scene } from "@/components/athari-ui/Art";
import {
  AthShell,
  CountChip,
  ElementDetail,
  ElementGrid,
  Glyph,
  Panel,
  PortfolioHero,
  SectionHead,
  StatStrip,
  evidenceCountLabel,
} from "@/components/athari-ui/Ui";
import { ProfessionalIdentityCard } from "@/components/ProfessionalIdentityCard";
import { EvidenceReport } from "@/components/EvidenceReport";
import { ShareEvidenceCard } from "@/components/ShareEvidenceCard";
import { BackToTop } from "@/components/BackToTop";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { requirementsForElement } from "@/data/mandatory-requirements";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
import { presentableEvidence } from "@/lib/shareText";
import type {
  PortfolioShare,
  ShareAttachment,
  ShareEvidence,
} from "@/lib/portfolioShare";

type ViewerAttachment = ShareAttachment & { title: string };

type GroupedElement = {
  element: (typeof OFFICIAL_TEACHER_FRAMEWORK_V2)[number];
  evidence: ShareEvidence[];
};

function viewerUrl(fileId: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

function uniqueEvidenceById(items: ShareEvidence[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function completedRequirementsForElement(evidence: ShareEvidence[], elementId: string) {
  const set = new Set<string>();
  for (const item of evidence) {
    const classification = item.classifications.find((entry) => entry.elementId === elementId);
    classification?.requirementIds?.forEach((id) => set.add(id));
  }
  return set;
}

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<ViewerAttachment | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  // Coming back from an element returns to the evaluation elements, not the top of the page.
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !activeElementId) {
      requestAnimationFrame(() => document.getElementById("evaluation-elements")?.scrollIntoView({ block: "start" }));
    }
    wasOpen.current = Boolean(activeElementId);
  }, [activeElementId]);
  const [report, setReport] = useState<ShareEvidence | null>(null);

  useEffect(() => {
    if (!viewer) return;

    const closeViewerFirst = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setViewer(null);
    };

    // Capture phase runs before EvidenceReport's document-level Escape handler.
    window.addEventListener("keydown", closeViewerFirst, true);
    return () => window.removeEventListener("keydown", closeViewerFirst, true);
  }, [viewer]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token") ?? "";

    if (!token) {
      setError("رابط المشاركة غير مكتمل.");
      setLoading(false);
      return;
    }

    getPublicPortfolioShare(token)
      .then((result) => {
        if (!result) {
          setError("رابط المشاركة غير متاح أو أُوقف.");
          return;
        }
        setShare({ ...result, evidence: result.evidence.map(presentableEvidence) });
      })
      .catch(() => setError("رابط المشاركة غير متاح أو أُوقف."))
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo<GroupedElement[]>(() => {
    if (!share) return [];

    const map = new Map<string, ShareEvidence[]>();
    for (const item of share.evidence) {
      for (const classification of item.classifications) {
        const current = map.get(classification.elementId) ?? [];
        if (!current.some((entry) => entry.id === item.id)) {
          map.set(classification.elementId, [...current, item]);
        }
      }
    }

    return OFFICIAL_TEACHER_FRAMEWORK_V2.map((element) => ({
      element,
      evidence: map.get(element.id) ?? [],
    }));
  }, [share]);

  const covered = grouped.filter((group) => group.evidence.length > 0).length;
  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const allEvidence = useMemo(
    () => uniqueEvidenceById(grouped.flatMap((group) => group.evidence)),
    [grouped]
  );

  const activeGroup = activeElementId
    ? grouped.find((group) => group.element.id === activeElementId) ?? null
    : null;

  const navGroups = grouped.filter((group) => group.evidence.length > 0);
  const navIndex = activeGroup ? navGroups.findIndex((group) => group.element.id === activeGroup.element.id) : -1;
  const prevGroup = navIndex > 0 ? navGroups[navIndex - 1] : null;
  const nextGroup = navIndex >= 0 && navIndex < navGroups.length - 1 ? navGroups[navIndex + 1] : null;
  function goToElement(id: string) {
    setActiveElementId(id);
    window.scrollTo({ top: 0 });
  }

  function openSpecificAttachment(item: ShareEvidence, attachmentIndex: number) {
    const attachment = item.attachments[attachmentIndex];
    if (!attachment?.driveFileId) return;
    setViewer({
      ...attachment,
      title:
        item.attachments.length === 1
          ? item.title
          : `${item.title} · الملف ${attachmentIndex + 1}`,
    });
  }

  if (loading) {
    return (
      <div className="ath">
        <main className="ath-auth">
          <div className="ath-auth-card ath-scene-card" aria-live="polite">
            <Scene kind="opening" />
            <strong>جاري فتح ملف الأداء…</strong>
            <p>لحظات ويظهر الملف المعتمد.</p>
          </div>
        </main>
      </div>
    );
  }

  if (!share || error) {
    return (
      <div className="ath">
        <main className="ath-auth">
          <div className="ath-auth-card ath-scene-card">
            <Scene kind="locked" />
            <strong>الرابط غير متاح</strong>
            <p>{error || "قد تكون مشاركة ملف الأداء قد أُوقفت."}</p>
          </div>
        </main>
      </div>
    );
  }

  // The principal sees the elements the teacher documented, never the empty ones.
  const elementSummaries = grouped
    .filter(({ evidence }) => evidence.length > 0)
    .map(({ element, evidence }) => ({
      id: element.id,
      name: element.officialName,
      count: evidence.length,
    }));

  function cardFor(item: ShareEvidence) {
    const primary = item.classifications.find((entry) => entry.isPrimary) ?? item.classifications[0];
    return (
      <ShareEvidenceCard
        key={item.id}
        item={{
          id: item.id,
          title: item.title,
          description: item.description,
          impact: item.impact,
          highlight: item.highlight,
          elementId: primary?.elementId,
          elementName: primary?.elementName,
          attachments: item.attachments,
        }}
        onOpenReport={() => setReport(item)}
        onOpenAttachment={(index) => openSpecificAttachment(item, index)}
        ownerName={share?.professionalProfile?.fullName || share?.ownerDisplayName || ""}
      />
    );
  }

  const activeCompleted = activeGroup
    ? completedRequirementsForElement(activeGroup.evidence, activeGroup.element.id)
    : new Set<string>();
  // Only the documented requirements, in their official order.
  const activeDocumented = activeGroup
    ? requirementsForElement(activeGroup.element.id).filter((requirement) => activeCompleted.has(requirement.id))
    : [];
  const reportEvidence = activeGroup ? activeGroup.evidence : allEvidence;

  return (
    <>
      <AthShell
        publicPage
        wide
        chips={["للعرض فقط"]}
        showNav={false}
        accountHref={null}
        back={activeGroup ? { onClick: () => setActiveElementId(null) } : undefined}
      >
        {activeGroup ? (
          <div className="ath-view-in" key={activeGroup.element.id}>
            <ElementDetail
              elementId={activeGroup.element.id}
              name={activeGroup.element.officialName}
              category={activeGroup.element.category}
              description={activeGroup.element.description}
              supports={ELEMENT_GUIDANCE[activeGroup.element.id]?.supports ?? []}
              crumbs={[{ label: "ملف الأداء", tap: { onClick: () => setActiveElementId(null) } }, { label: "عناصر التقييم", tap: { onClick: () => setActiveElementId(null) } }]}
              evidence={activeGroup.evidence.map((item) => ({
                id: item.id,
                title: item.title,
                description: item.description,
                fileCount: item.attachments.length,
                view: { onClick: () => setReport(item) },
                extra: (
                  <>
                    {item.impact ? <div className="ath-impact">{item.impact}</div> : null}
                    {item.attachments.length > 1 ? (
                      <div className="ath-file-links no-print">
                        {item.attachments.map((attachment, index) =>
                          attachment.driveFileId ? (
                            <button type="button" key={`${item.id}-${index}`} onClick={() => openSpecificAttachment(item, index)}>الملف {index + 1}</button>
                          ) : null
                        )}
                      </div>
                    ) : null}
                  </>
                ),
              }))}
              evidenceList={
                <div className="sec-list">
                  {activeGroup.evidence.map((item) => cardFor(item))}
                </div>
              }
            />

            {activeDocumented.length ? (
              <Panel
                icon={<Glyph name="check" size={22} />}
                title="بنود المتابعة الموثقة"
                sub="بنود هذا العنصر المثبتة بشواهد معتمدة."
              >
                <div className="ath-stack">
                  {activeDocumented.map((requirement) => (
                    <div className="ath-file-row" key={requirement.id}>
                      <span className="ic"><Glyph name="check" size={19} /></span>
                      <div className="nm"><strong>{requirement.label}</strong><span>موثق بشاهد معتمد</span></div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            {navIndex >= 0 ? (
              <nav className="sec-nav no-print" aria-label="التنقل بين عناصر التقييم">
                {prevGroup ? (
                  <button type="button" className="sec-nav-btn prev" onClick={() => goToElement(prevGroup.element.id)}>
                    <small>العنصر السابق</small>
                    <strong>{prevGroup.element.officialName}</strong>
                  </button>
                ) : <span />}
                <span className="sec-nav-pos">{navIndex + 1} من {navGroups.length}</span>
                {nextGroup ? (
                  <button type="button" className="sec-nav-btn next" onClick={() => goToElement(nextGroup.element.id)}>
                    <small>العنصر التالي</small>
                    <strong>{nextGroup.element.officialName}</strong>
                  </button>
                ) : (
                  <button type="button" className="sec-nav-btn next" onClick={() => setActiveElementId(null)}>
                    <small>انتهت العناصر</small>
                    <strong>العودة إلى عناصر التقييم</strong>
                  </button>
                )}
              </nav>
            ) : null}
          </div>
        ) : (
          <>
            <PortfolioHero
              year={share.academicYear}
              name={share.professionalProfile?.fullName || share.ownerDisplayName}
              evidenceCount={share.evidence.length}
              covered={covered}
              total={total}
              browse={{ onClick: () => document.getElementById("evaluation-elements")?.scrollIntoView({ behavior: "smooth" }) }}
              browseLabel="استعراض عناصر التقييم"
              showCoverage={false}
            />

            <ProfessionalIdentityCard
              profile={share.professionalProfile}
              fallbackName={share.ownerDisplayName}
              documents={share.documents.map((entry) => ({ key: entry.driveFileId, label: entry.label }))}
              onOpenDocument={(key) => {
                const entry = share.documents.find((item) => item.driveFileId === key);
                if (entry) setViewer({ ...entry, title: entry.label });
              }}
            />


            <StatStrip
              first={{ title: "صفحة للعرض فقط", sub: "لا يمكن التعديل على المحتوى" }}
              evidenceCount={share.evidence.length}
              covered={covered}
              total={total}
              showTotal={false}
            />

            <div id="evaluation-elements">
              <SectionHead icon={<Glyph name="bars" />} title="عناصر التقييم" side={<CountChip total={covered} />} />
            </div>
            <ElementGrid
              elements={elementSummaries}
              tapFor={(id) => ({ onClick: () => { setActiveElementId(id); window.scrollTo({ top: 0 }); } })}
            />

            <div id="approved-evidence">
              <SectionHead
                icon={<Glyph name="doc" className="ath-green-ico" />}
                title="الشواهد المعتمدة"
                sub={evidenceCountLabel(allEvidence.length)}
              />
            </div>
            <div className="sec-all no-print">
              <button type="button" className="sec-all-toggle" aria-expanded={showAll} aria-controls="all-evidence-list" onClick={() => setShowAll((value) => !value)}>
                {showAll ? "إخفاء جميع الشواهد ▴" : `عرض جميع الشواهد (${allEvidence.length}) ▾`}
              </button>
            </div>
            <div id="all-evidence-list" className="sec-list" hidden={!showAll}>{allEvidence.map((item) => cardFor(item))}</div>

            <p className="ath-footnote">أثري · مشاركة ملف الأداء · للعرض فقط</p>
          </>
        )}
      </AthShell>

      {report || viewer ? null : <BackToTop />}

      {report ? (
        <EvidenceReport
          item={report}
          position={{ index: Math.max(0, reportEvidence.findIndex((entry) => entry.id === report.id)), total: reportEvidence.length }}
          onPrev={(() => {
            const at = reportEvidence.findIndex((entry) => entry.id === report.id);
            return at > 0 ? () => setReport(reportEvidence[at - 1]) : undefined;
          })()}
          onNext={(() => {
            const at = reportEvidence.findIndex((entry) => entry.id === report.id);
            return at >= 0 && at < reportEvidence.length - 1 ? () => setReport(reportEvidence[at + 1]) : undefined;
          })()}
          meta={{
            ownerName: share.professionalProfile?.fullName || share.ownerDisplayName,
            ministry: share.professionalProfile?.employer || "",
            school: share.professionalProfile?.school || "",
            department: share.professionalProfile?.educationDepartment || "",
            principalName: share.professionalProfile?.principalName || "",
            specialization: share.professionalProfile?.specialization || "",
            rank: share.professionalProfile?.professionalRank || "",
            academicYear: share.academicYear,
          }}
          onClose={() => setReport(null)}
          onOpenAttachment={(index) => openSpecificAttachment(report, index)}
        />
      ) : null}

      {viewer?.driveFileId ? (
        <div className="share-viewer-backdrop no-print" onClick={() => setViewer(null)}>
          <section className="share-viewer" onClick={(event) => event.stopPropagation()}>
            <header className="share-viewer-head">
              <div><span className="eyebrow">معاينة الشاهد</span><strong>{viewer.title}</strong></div>
              <button type="button" onClick={() => setViewer(null)} aria-label="إغلاق">×</button>
            </header>
            <iframe src={viewerUrl(viewer.driveFileId)} title={viewer.title} allow="autoplay" />
          </section>
        </div>
      ) : null}
    </>
  );
}

