import { AppShell } from "@/components/AppShell";
import { frameworkElements } from "@/data/demo";
import { Icon } from "@/components/Icon";

export default function PortfolioPage() {
  return (
    <AppShell title="ملفي" subtitle="شواهدك المعتمدة حسب عناصر الأداء">
      <section className="portfolio-summary">
        <span className="eyebrow">1448 هـ</span>
        <h1>ملف الأداء المهني</h1>
        <p>9 شواهد معتمدة موزعة على 5 عناصر.</p>
      </section>

      <div className="stack">
        {frameworkElements.map((element, index) => (
          <article className="element-card" key={element.name}>
            <div className="element-number">{index + 1}</div>
            <div className="element-copy">
              <strong>{element.name}</strong>
              <span>{element.count} {element.count === 1 ? "شاهد" : "شواهد"}</span>
            </div>
            <Icon name="chevron" size={19} />
          </article>
        ))}
      </div>

      <section className="coverage-note">
        <Icon name="sparkle" size={20} />
        <div>
          <strong>التغطية هنا وصفية فقط</strong>
          <p>أثري لا يمنحك درجة أداء آلية. سيعرض لاحقًا العناصر التي تحتاج شواهد إضافية فقط.</p>
        </div>
      </section>
    </AppShell>
  );
}
