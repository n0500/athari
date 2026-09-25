import { AppShell } from "@/components/AppShell";

export default function TermsPage() {
  return (
    <AppShell
      title="شروط الاستخدام"
      subtitle="أثري | Athari"
      showNav={false}
    >
      <section className="hero-card">
        <span className="eyebrow">استخدام أثري</span>
        <h1>شروط الاستخدام</h1>
        <p>
          أثري أداة لمساعدة المعلم على تنظيم الشواهد وصياغة محتوى قابل
          للمراجعة، ولا يعتمد أي محتوى نهائي دون موافقة المستخدم.
        </p>
      </section>

      <section className="page-section stack">
        <article className="section-card">
          <h2>مسؤولية المستخدم</h2>
          <p className="muted-copy">
            المستخدم مسؤول عن صحة الملفات والمعلومات التي يرفعها، وعن
            مراجعة أي اقتراح أو صياغة ينتجها الذكاء الاصطناعي قبل اعتمادها.
          </p>
        </article>

        <article className="section-card">
          <h2>دقة المحتوى</h2>
          <p className="muted-copy">
            صمم أثري لتجنب اختلاق المعلومات، ومع ذلك يجب التحقق من النتائج
            قبل استخدامها في ملف مهني أو إجراء رسمي.
          </p>
        </article>

        <article className="section-card">
          <h2>الاستخدام المشروع</h2>
          <p className="muted-copy">
            لا يجوز استخدام أثري لرفع محتوى لا يملك المستخدم حق استخدامه
            أو لمشاركة بيانات حساسة لا يلزم وجودها في الشاهد.
          </p>
        </article>

        <article className="section-card">
          <h2>التواصل</h2>
          <p className="muted-copy">
            للاستفسارات:{" "}
            <a className="text-link" href="mailto:t.nuha0500@gmail.com">
              t.nuha0500@gmail.com
            </a>
          </p>
        </article>
      </section>
    </AppShell>
  );
}
