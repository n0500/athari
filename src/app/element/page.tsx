"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { AthShell, ElementDetail, Glyph, Notice, Panel } from "@/components/athari-ui/Ui";
import { Icon } from "@/components/Icon";
import { EvidenceReport, type ReportEvidence } from "@/components/EvidenceReport";
import { getProfessionalProfile } from "@/lib/professionalProfile";
import { ElementExcellence } from "@/components/ElementExcellence";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { requirementsForElement } from "@/data/mandatory-requirements";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import type { ApprovedClassification, EvidenceAttachment, EvidenceRecord } from "@/types/athari";

function classificationForElement(item: EvidenceRecord, elementId: string): ApprovedClassification | null {
  const approved = item.approvedContent;
  if (!approved) return null;
  if (approved.classifications?.length) {
    return approved.classifications.find((entry) => entry.elementId === elementId) ?? null;
  }
  if (approved.elementId === elementId) {
    return {
      elementId: approved.elementId,
      elementName: approved.elementName,
      isPrimary: true,
      requirementIds: [],
    };
  }
  return null;
}

function itemCoversElement(item: EvidenceRecord, elementId: string) {
  return Boolean(classificationForElement(item, elementId));
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [
    {
      originalFileName: item.originalFileName,
      mimeType: item.mimeType,
      fileSize: item.fileSize,
      ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
      ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
    },
  ];
}

function reportClassifications(item: EvidenceRecord): ReportEvidence["classifications"] {
  const approved = item.approvedContent;
  if (!approved) return [];
  if (approved.classifications?.length) {
    return approved.classifications.map((entry) => ({
      elementId: entry.elementId,
      elementName: entry.elementName,
      isPrimary: entry.isPrimary,
      requirementIds: entry.requirementIds ?? [],
    }));
  }
  return approved.elementId ? [{ elementId: approved.elementId, elementName: approved.elementName, isPrimary: true }] : [];
}

function ElementPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const elementId = params.get("id") ?? "";
  const element = OFFICIAL_TEACHER_FRAMEWORK_V2.find((entry) => entry.id === elementId);
  const guidance = element ? ELEMENT_GUIDANCE[element.id] : undefined;
  const [report, setReport] = useState<{ data: ReportEvidence; links: string[] } | null>(null);
  const [owner, setOwner] = useState({ name: "", ministry: "", school: "", department: "", principal: "" });
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        setItems([]);
        setLoading(false);
        return;
      }

      getProfessionalProfile(user.uid)
        .then((profile) =>
          setOwner({
            name: profile.fullName || user.displayName?.trim() || "",
            ministry: profile.employer,
            school: profile.school,
            department: profile.educationDepartment,
            principal: profile.principalName ?? "",
          })
        )
        .catch(() => setOwner({ name: user.displayName?.trim() || "", ministry: "", school: "", department: "", principal: "" }));

      try {
        setError("");
        const all = await listUserEvidence(user.uid);
        setItems(
          all.filter(
            (item) => item.status === "approved" && itemCoversElement(item, elementId)
          )
        );
      } catch {
        setError("تعذر تحميل شواهد هذا العنصر الآن.");
      } finally {
        setLoading(false);
      }
    });
  }, [elementId]);

  const requirements = useMemo(
    () => (element ? requirementsForElement(element.id) : []),
    [element]
  );

  const completedRequirementIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      const classification = classificationForElement(item, elementId);
      classification?.requirementIds?.forEach((id) => set.add(id));
    }
    return set;
  }, [items, elementId]);

  if (!element) {
    return (
      <AthShell title="عنصر التقييم" subtitle="بيانات العنصر والشواهد المرتبطة به.">
        <Notice tone="error">
          تعذر تحديد عنصر التقييم. <Link href="/portfolio">العودة إلى ملف الأداء</Link>
        </Notice>
      </AthShell>
    );
  }

  function openReport(item: EvidenceRecord) {
    setReport({
      data: {
        id: item.id,
        title: item.approvedContent?.title || item.originalFileName,
        description: item.approvedContent?.description || "",
        impact: item.approvedContent?.impact || "",
        highlight: item.approvedContent?.highlight || "",
        classifications: reportClassifications(item),
        attachments: attachmentsFor(item).map((attachment) => ({
          originalFileName: attachment.originalFileName,
          mimeType: attachment.mimeType,
          ...(attachment.driveFileId ? { driveFileId: attachment.driveFileId } : {}),
        })),
      },
      links: attachmentsFor(item).map((attachment) => attachment.driveWebViewLink || ""),
    });
  }

  const evidence = items.map((item) => {
    const impact = item.approvedContent?.impact || "";
    const firstLink = attachmentsFor(item)[0]?.driveWebViewLink;
    return {
      id: item.id,
      title: item.approvedContent?.title || item.originalFileName,
      description: item.approvedContent?.description || "",
      fileCount: attachmentsFor(item).length,
      view: { href: `/evidence/review?id=${encodeURIComponent(item.id)}` },
      extra: (
        <>
          <button
            type="button"
            className="ath-attach no-print"
            onClick={() => openReport(item)}
          >
            <Glyph name="download" size={14} /> تقرير PDF
          </button>
          {impact && impact !== "لا يوجد أثر موثق متاح حاليًا." ? (
            <div className="ath-impact">{impact}</div>
          ) : null}
          {firstLink ? (
            <a className="ath-attach no-print" href={firstLink} target="_blank" rel="noreferrer">
              <Icon name="paperclip" size={14} /> فتح المرفقات
            </a>
          ) : null}
        </>
      ),
    };
  });

  return (
    <AthShell
      title="عنصر التقييم"
      subtitle="بيانات العنصر والشواهد المرتبطة به."
      back={{
        onClick: () =>
          window.history.length > 1 ? router.back() : router.push("/portfolio"),
      }}
    >
      <ElementDetail
        elementId={element.id}
        name={element.officialName}
        category={element.category}
        description={element.description}
        supports={guidance?.supports ?? []}
        excellence={
          loading ? null : (
            <ElementExcellence
              ownerHint
              sources={items.map((item) => ({
                id: item.id,
                title: item.approvedContent?.title || item.originalFileName,
                highlight: item.approvedContent?.highlight,
              }))}
              onOpenEvidence={(id) => {
                const found = items.find((entry) => entry.id === id);
                if (found) openReport(found);
              }}
            />
          )
        }
        evidence={evidence}
        loading={loading}
        crumbs={[
          { label: "ملف الأداء", tap: { href: "/portfolio" } },
          { label: "عناصر التقييم", tap: { href: "/portfolio" } },
        ]}
      />

      {requirements.length ? (
        <Panel
          icon={<Glyph name="bars" size={22} />}
          title="بنود المتابعة الإلزامية"
          sub={loading ? "جاري التحميل…" : `${completedRequirementIds.size} من ${requirements.length} بنود موثقة`}
        >
          <div className="ath-stack">
            {requirements.map((requirement) => {
              const done = completedRequirementIds.has(requirement.id);
              return (
                <div className="ath-file-row" key={requirement.id}>
                  <span className="ic"><Glyph name={done ? "check" : "empty"} size={19} /></span>
                  <div className="nm"><strong>{requirement.label}</strong><span>{done ? "موثق بشاهد معتمد" : "يحتاج شاهدًا موثقًا"}</span></div>
                </div>
              );
            })}
          </div>
          {items.length && completedRequirementIds.size === 0 ? (
            <Notice>الشواهد المعتمدة السابقة لا تُحتسب على البنود تلقائيًا. افتحي الشاهد وأكدي البنود التي يثبتها.</Notice>
          ) : null}
        </Panel>
      ) : null}

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Link className="ath-cta no-print" href="/evidence/new">
        <Icon name="plus" size={22} /> إضافة شاهد
      </Link>
      {report ? (
        <EvidenceReport
          item={report.data}
          allowDownload
          meta={{
            ownerName: owner.name,
            ministry: owner.ministry,
            school: owner.school,
            department: owner.department,
            principalName: owner.principal,
            academicYear: items.find((entry) => entry.id === report.data.id)?.academicYear,
          }}
          onClose={() => setReport(null)}
          onOpenAttachment={(index) => {
            const link = report.links[index];
            if (link) window.open(link, "_blank", "noopener");
          }}
        />
      ) : null}
    </AthShell>
  );
}

export default function ElementPage() {
  return (
    <Suspense fallback={<div className="setup-notice">جاري تحميل عنصر التقييم…</div>}>
      <ElementPageInner />
    </Suspense>
  );
}
