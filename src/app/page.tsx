import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { EvidenceCard } from "@/components/EvidenceCard";
import { Icon } from "@/components/Icon";
import { evidenceItems } from "@/data/demo";

export default function HomePage() {
  const needsAttention = evidenceItems.filter((item) => item.status !== "approved");

  return (
    <AppShell title="أثري" subtitle="ملف الأداء الذكي">
      <section className="hero-card">
        <div>
          <span className="eyebrow">ملفك الحالي</span>
          <h1>صباح الإنجاز 👋</h1>
          <p>ارفعي الشاهد، وأثري يساعدك في قراءته وتصنيفه وصياغته قبل اعتماده.</p>
        </div>
        <Link className="primary-button hero-button" href="/evidence/new">
          <Icon name="plus" size={20} />
          إضافة شاهد
        </Link>
      </section>

      <section className="stats-grid" aria-label="ملخص الملف">
        <div className="stat-card">
          <strong>9</strong>
          <span>شواهد معتمدة</span>
        </div>
        <div className="stat-card stat-attention">
          <strong>2</strong>
          <span>تحتاج مراجعة</span>
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">متابعة سريعة</span>
            <h2>يحتاج انتباهك</h2>
          </div>
          <Link href="/evidence" className="text-link">عرض الكل</Link>
        </div>

        <div className="stack">
          {needsAttention.map((item) => (
            <EvidenceCard item={item} key={item.id} />
          ))}
        </div>
      </section>

      <section className="tip-card">
        <div className="tip-icon"><Icon name="sparkle" /></div>
        <div>
          <strong>أثري لا يعتمد أي شيء تلقائيًا</strong>
          <p>كل تصنيف أو صياغة يعرض عليك أولًا، والقرار النهائي لك.</p>
        </div>
      </section>
    </AppShell>
  );
}
