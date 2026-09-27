"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { AthShell, ElementDetail, Notice } from "@/components/athari-ui/Ui";
import { Icon } from "@/components/Icon";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import type { EvidenceAttachment, EvidenceRecord } from "@/types/athari";

function itemCoversElement(item: EvidenceRecord, elementId: string) {
  const approved = item.approvedContent;
  if (!approved) return false;
  if (approved.classifications?.length) {
    return approved.classifications.some((entry) => entry.elementId === elementId);
  }
  return approved.elementId === elementId;
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

function ElementPageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const elementId = params.get("id") ?? "";
  const element = OFFICIAL_TEACHER_FRAMEWORK_V2.find((entry) => entry.id === elementId);
  const guidance = element ? ELEMENT_GUIDANCE[element.id] : undefined;
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

  if (!element) {
    return (
      <AthShell title="عنصر التقييم" subtitle="بيانات العنصر والشواهد المرتبطة به.">
        <Notice tone="error">
          تعذر تحديد عنصر التقييم. <Link href="/portfolio">العودة إلى ملف الأداء</Link>
        </Notice>
      </AthShell>
    );
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
        evidence={evidence}
        loading={loading}
        crumbs={[
          { label: "ملف الأداء", tap: { href: "/portfolio" } },
          { label: "عناصر التقييم", tap: { href: "/portfolio" } },
        ]}
      />

      {error ? <Notice tone="error">{error}</Notice> : null}

      <Link className="ath-cta no-print" href="/evidence/new">
        <Icon name="plus" size={22} /> إضافة شاهد
      </Link>
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
