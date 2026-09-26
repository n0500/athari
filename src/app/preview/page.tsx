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
import { ELEMENT_GUIDANCE } from "@/data/element-guidance";
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
        const current = map.get(classification.elementId) ?? [];
        if (!current.some((entry) => entry.id === item.id)) map.set(classification.elementId, [...current, item]);
      }
    }
    return map;
  }, [items]);

  const covered = [...byElement.values()].filter((entries) => entries.length).length;
  const total = OFFICIAL_TEACHER_FRAMEWORK_V2.length;
  const year = process.env.NEXT_PUBLIC_ATHARI_ACADEMIC_YEAR || "1448هـ";

  return (
    <AppShell showNav={false}>
      <div className="exact-preview-actions no-print">
        <Link href="/portfolio"><Icon name="back" size={17} /> رجوع إلى ملفي</Link>
        <button onClick={() => window.print()}><Icon name="print" size={17} /> طباعة / حفظ PDF</button>
      </div>

      <section className="exact-preview-hero">
        <img src="/athari-assets/hero-preview.webp" alt="" />
        <div>
          <span><Icon name="calendar" size={15} /> العام الدراسي {year}</span>
          <h1>ملف الشواهد المهنية</h1>
          <div className="exact-preview-metrics">
            <b>{loading ? "…" : items.length}<small>شواهد معتمدة</small></b>
            <b>{loading ? "…" : `${covered} من ${total}`}<small>عناصر مغطاة</small></b>
          </div>
        </div>
      </section>

      <section className="exact-preview-summary">
        <span><Icon name="file" size={22} /></span>
        <div>
          <h2>ملخص الملف</h2>
          <p>تعرض هذه الصفحة الشواهد المعتمدة في ضوء عناصر الأداء الرسمية للتقييم. جميع الملفات الأصلية محفوظة في Google Drive ولا يمكن التعديل عليها من خلال هذه الصفحة.</p>
        </div>
      </section>

      <section className="exact-preview-elements">
        <div className="exact-preview-heading">
          <span><Icon name="analytics" size={21} /></span>
          <div><h2>عناصر التقييم ({total} عنصرًا)</h2><p>عرض حالة تغطية كل عنصر من عناصر التقييم الرسمي بناءً على الشواهد المعتمدة.</p></div>
        </div>

        <div className="exact-preview-list">
          {OFFICIAL_TEACHER_FRAMEWORK_V2.map((element, index) => {
            const evidence = byElement.get(element.id) ?? [];
            const guidance = ELEMENT_GUIDANCE[element.id];
            return (
              <article className={`exact-preview-row ${evidence.length ? "covered" : "empty"}`} key={element.id}>
                <span className={`exact-preview-icon art-${index + 1}`}><Icon name={guidance?.icon ?? "file"} size={26} /></span>
                <span className="exact-preview-number">{index + 1}</span>
                <strong>{element.officialName}</strong>
                <span className="exact-preview-status">{evidence.length ? <><Icon name="check" size={14} /> {evidence.length} {evidence.length === 1 ? "شاهد معتمد" : "شواهد معتمدة"}</> : "غير مغطى"}</span>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
