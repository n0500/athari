import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EvidenceCard } from "@/components/EvidenceCard";
import { Icon } from "@/components/Icon";
import { evidenceItems } from "@/data/demo";

export default function EvidencePage() {
  return (
    <AppShell title="الشواهد" subtitle="راجعي ونظمي ما رفعته">
      <div className="segment-control" role="tablist" aria-label="حالة الشواهد">
        <button className="segment active">تحتاج مراجعة</button>
        <button className="segment">معتمدة</button>
        <button className="segment">الكل</button>
      </div>

      <div className="stack">
        {evidenceItems.map((item) => <EvidenceCard item={item} key={item.id} />)}
      </div>

      <Link className="floating-add" href="/evidence/new" aria-label="إضافة شاهد">
        <Icon name="plus" size={25} />
      </Link>
    </AppShell>
  );
}
