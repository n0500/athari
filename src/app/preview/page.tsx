"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";
import { requireAuth } from "@/lib/firebase";
import { listUserEvidence } from "@/lib/firestore";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import {
  ApprovedClassification,
  EvidenceAttachment,
  EvidenceRecord,
} from "@/types/athari";

function classificationsFor(item: EvidenceRecord): ApprovedClassification[] {
  const approved = item.approvedContent;
  if (!approved) return [];
  if (approved.classifications?.length) return approved.classifications.slice(0, 3);
  if (approved.elementId && approved.elementName) {
    return [{ elementId: approved.elementId, elementName: approved.elementName, isPrimary: true }];
  }
  return [];
}

function attachmentsFor(item: EvidenceRecord): EvidenceAttachment[] {
  if (item.attachments?.length) return item.attachments;
  return [{
    originalFileName: item.originalFileName,
    mimeType: item.mimeType,
    fileSize: item.fileSize,
    ...(item.driveFileId ? { driveFileId: item.driveFileId } : {}),
    ...(item.driveWebViewLink ? { driveWebViewLink: item.driveWebViewLink } : {}),
  }];
}

export default function PreviewPage() {
  const router = useRouter();
  const [items, setItems] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(requireAuth(), async (user) => {
      if (!user) {
        router.replace("/login");
        return;
      }

      try {
        const all = await listUserEvidence(user.uid);
        setItems(all.filter((item) => item.status === "approved"));
      } finally {
        setLoading(false);
      }
    });
  }, [router]);

  const byElement = useMemo(() => {
    const map = new Map<string, EvidenceRecord[]>();
    for (const item of items) {
      for (const classification of classificationsFor(item)) {
        map.set(classification.elementId, [
          ...(map.get(classification.elementId) || []),
          item,
        ]);
      }
    }
    return map;
  }, [items]);

  const covered = [...byElement.values()].filter((entries) => entries.length).length;
  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const year = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  return (
    <AppShell title="معاينة الملف" subtitle="نسخة العرض قبل المشاركة" showNav={false}>
      <div className="preview-toolbar no-print">
        <Link className="secondary-button" href="/portfolio">
          رجوع إلى ملفي
        </Link>
        <button className="primary-button" onClick={() => window.print()}>
          <Icon name="print" size={18} />
          طباعة / حفظ PDF
        </button>
      </div>

      <article className="preview-document">
        <header className="preview-cover">
          <div className="preview-brand">أ</div>
          <div>
            <span className="preview-kicker">أثري · ملف الأداء المهني</span>
            <h1>ملف الشواهد المهنية</h1>
            <p>العام الدراسي {year}</p>
          </div>
          <div className="preview-summary">
            <strong>{loading ? "…" : items.length}</strong>
            <span>شاهد معتمد</span>
            <strong>{loading ? "…" : `${covered}/${total}`}</strong>
            <span>عناصر مغطاة</span>
          </div>
        </header>

        <section className="preview-intro">
          <h2>ملخص الملف</h2>
          <p>
            يعرض هذا الملف الشواهد المعتمدة مرتبة وفق عناصر تقييم أداء المعلم،
            مع إبقاء الأصول محفوظة في Google Drive.
          </p>
        </section>

        <div className="preview-elements">
          {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => {
            const evidence = byElement.get(element.id) || [];
            return (
              <section className={`preview-element ${evidence.length ? "is-covered" : ""}`} key={element.id}>
                <div className="preview-element-head">
                  <span className="preview-element-number">{index + 1}</span>
                  <div>
                    <h2>{element.officialName}</h2>
                    <p>{element.weightPercent ? `${element.weightPercent}% من وزن التقييم` : "عنصر أداء"}</p>
                  </div>
                  <span className={`coverage-chip ${evidence.length ? "covered" : "empty"}`}>
                    {evidence.length ? `${evidence.length} ${evidence.length === 1 ? "شاهد" : "شواهد"}` : "غير مغطى"}
                  </span>
                </div>

                {evidence.length ? (
                  <div className="preview-evidence-list">
                    {evidence.map((item) => {
                      const attachments = attachmentsFor(item);
                      return (
                        <article className="preview-evidence" key={`${element.id}-${item.id}`}>
                          <h3>{item.approvedContent?.title || item.originalFileName}</h3>
                          {item.approvedContent?.description ? (
                            <p>{item.approvedContent.description}</p>
                          ) : null}
                          {item.approvedContent?.impact ? (
                            <div className="preview-impact">
                              <strong>الأثر</strong>
                              <span>{item.approvedContent.impact}</span>
                            </div>
                          ) : null}
                          <div className="preview-file-row">
                            <Icon name="file" size={15} />
                            <span>{attachments.length === 1 ? "ملف أصلي واحد" : `${attachments.length} ملفات أصلية`}</span>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <p className="preview-empty-note">لا توجد شواهد معتمدة لهذا العنصر حتى الآن.</p>
                )}
              </section>
            );
          })}
        </div>

        <footer className="preview-footer">
          <span>أثري</span>
          <span>ملف أداء مهني منظم ومراجع من صاحبة الملف</span>
        </footer>
      </article>
    </AppShell>
  );
}
