import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export default function NewEvidencePage() {
  return (
    <AppShell title="إضافة شاهد" subtitle="ابدئي بالأصل كما هو">
      <section className="upload-card">
        <div className="upload-icon"><Icon name="upload" size={30} /></div>
        <h1>ارفعي الشاهد الأصلي</h1>
        <p>صورة أو PDF أو مستند مدعوم. سنقرأ المحتوى ونقترح التصنيف والصياغة، ولن يضاف شيء لملفك قبل موافقتك.</p>

        <label className="upload-picker">
          <input type="file" accept="image/*,.pdf" />
          <span>اختيار ملف</span>
        </label>

        <div className="privacy-row">
          <Icon name="check" size={18} />
          <span>الشاهد يبقى خاصًا بحسابك ولا يصبح عامًا.</span>
        </div>
      </section>

      <section className="how-it-works">
        <span className="eyebrow">ماذا سيحدث؟</span>
        <ol className="steps-list">
          <li><span>1</span><div><strong>نقرأ الشاهد</strong><p>نستخرج المعلومات الظاهرة فقط.</p></div></li>
          <li><span>2</span><div><strong>نقترح</strong><p>عنصر الأداء والعنوان والوصف والأثر.</p></div></li>
          <li><span>3</span><div><strong>أنتِ تعتمدين</strong><p>يمكنك التعديل قبل إضافته لملفك.</p></div></li>
        </ol>
      </section>

      <Link className="secondary-button full-button" href="/evidence/1">
        عرض نموذج المراجعة
        <Icon name="chevron" size={18} />
      </Link>
    </AppShell>
  );
}
