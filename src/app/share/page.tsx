"use client";

import { useEffect, useMemo, useState } from "react";
import { Scene } from "@/components/athari-ui/Art";
import {
  AthShell,
  CountChip,
  ElementDetail,
  ElementGrid,
  EvidenceTiles,
  Glyph,
  PortfolioHero,
  SectionHead,
  StatStrip,
} from "@/components/athari-ui/Ui";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { getPublicPortfolioShare } from "@/lib/portfolioShare";
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

export default function PublicSharePage() {
  const [share, setShare] = useState<PortfolioShare | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewer, setViewer] = useState<ViewerAttachment | null>(null);
  const [activeElementId, setActiveElementId] = useState<string | null>(null);

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
        setShare(result);
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

  function openFirstAttachment(item: ShareEvidence) {
    const attachment = item.attachments.find((entry) => entry.driveFileId);
    if (!attachment) return;
    setViewer({ ...attachment, title: item.title });
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

  const elementSummaries = grouped.map(({ element, evidence }) => ({
    id: element.id,
    name: element.officialName,
    count: evidence.length,
  }));

  const tiles = allEvidence.map((item) => {
    const primary = item.classifications.find((entry) => entry.isPrimary) ?? item.classifications[0];
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      elementId: primary?.elementId,
      elementName: primary?.elementName,
      view: {
        onClick: () => openFirstAttachment(item),
        disabled: !item.attachments.some((entry) => entry.driveFileId),
      },
    };
  });

  return (
    <>
      <AthShell
        chips={["للعرض فقط"]}
        showNav={false}
        accountHref={null}
        back={activeGroup ? { onClick: () => setActiveElementId(null) } : undefined}
      >
        {activeGroup ? (
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
              view: {
                onClick: () => openSpecificAttachment(item, Math.max(0, item.attachments.findIndex((entry) => entry.driveFileId))),
                disabled: !item.attachments.some((entry) => entry.driveFileId),
              },
              extra: (
                <>
                  {item.impact ? <div className="ath-impact">{item.impact}</div> : null}
                  {item.attachments.length > 1 ? (
                    <div className="ath-file-links no-print">
                      {item.attachments.map((attachment, index) =>
                        attachment.driveFileId ? (
                          <button type="button" key={`${item.id}-${index}`} onClick={() => openSpecificAttachment(item, index)}>
                            الملف {index + 1}
                          </button>
                        ) : null
                      )}
                    </div>
                  ) : null}
                </>
              ),
            }))}
          />
        ) : (
          <>
            <PortfolioHero
              year={share.academicYear}
              name={share.ownerDisplayName}
              evidenceCount={share.evidence.length}
              covered={covered}
              total={total}
              browse={{ onClick: () => document.getElementById("approved-evidence")?.scrollIntoView({ behavior: "smooth" }) }}
              print={{ onClick: () => window.print() }}
            />

            <StatStrip
              first={{ title: "صفحة للعرض فقط", sub: "لا يمكن التعديل على المحتوى" }}
              evidenceCount={share.evidence.length}
              covered={covered}
              total={total}
            />

            <SectionHead
              icon={<Glyph name="bars" />}
              title="عناصر التقييم"
              side={<CountChip total={total} />}
            />
            <ElementGrid
              elements={elementSummaries}
              tapFor={(id) => ({ onClick: () => { setActiveElementId(id); window.scrollTo({ top: 0 }); } })}
            />

            <div id="approved-evidence">
              <SectionHead
                icon={<Glyph name="doc" className="ath-green-ico" />}
                title="الشواهد المعتمدة"
                sub={`${allEvidence.length} ${allEvidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}`}
              />
            </div>
            <EvidenceTiles items={tiles} />

            <p className="ath-footnote">أثري · مشاركة ملف الأداء · للعرض فقط</p>
          </>
        )}
      </AthShell>

      {viewer?.driveFileId ? (
        <div className="share-viewer-backdrop no-print" onClick={() => setViewer(null)}>
          <section className="share-viewer" onClick={(event) => event.stopPropagation()}>
            <header className="share-viewer-head">
              <div>
                <span className="eyebrow">معاينة الشاهد</span>
                <strong>{viewer.title}</strong>
              </div>
              <button type="button" onClick={() => setViewer(null)} aria-label="إغلاق">×</button>
            </header>
            <iframe src={viewerUrl(viewer.driveFileId)} title={viewer.title} allow="autoplay" />
          </section>
        </div>
      ) : null}
    </>
  );
}
