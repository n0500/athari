import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SectionCard } from "@/components/SectionCard";
import { Icon } from "@/components/Icon";
import { evidenceItems } from "@/data/demo";

export default async function EvidenceReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const item = evidenceItems.find((e) => e.id === id) ?? evidenceItems[0];
  if (!item) notFound();

  return (
    <AppShell title="مراجعة الشاهد" subtitle="القرار النهائي لك">
      <section className="original-file">
        <div className="file-preview-icon"><Icon name="file" size={25} /></div>
        <div>
          <span className="eyebrow">الشاهد الأصلي</span>
          <strong>{item.fileName}</strong>
          <p>يمكنك دائمًا الرجوع إلى الأصل قبل الاعتماد.</p>
        </div>
        <button className="mini-button">فتح</button>
      </section>

      <SectionCard title="ما فهمه أثري من الشاهد" eyebrow="حقائق مستخرجة">
        <ul className="facts-list">
          <li>تم تنفيذ إجراء تعليمي مرتبط بمهارة الاستماع.</li>
          <li>يوجد قياس أو نتيجة مرفقة بالشاهد.</li>
          <li>الشاهد يتضمن متابعة للطالبات بعد التنفيذ.</li>
        </ul>
      </SectionCard>

      <SectionCard title="التصنيف المقترح" eyebrow="اقتراح قابل للتعديل">
        <div className="classification-choice selected-choice">
          <div>
            <strong>تحسين نتائج المتعلمين</strong>
            <p>لأن الشاهد يجمع بين إجراء تعليمي ونتيجة أو متابعة للأثر.</p>
          </div>
          <Icon name="check" size={20} />
        </div>
        <button className="text-action">تغيير التصنيف</button>
      </SectionCard>

      <SectionCard title="الصياغة المقترحة" eyebrow="راجعي قبل الاعتماد">
        <label className="field-label">عنوان الشاهد</label>
        <div className="editable-field">
          <span>تحسين مهارة الاستماع من خلال خطة علاجية</span>
          <Icon name="edit" size={18} />
        </div>

        <label className="field-label">وصف التنفيذ</label>
        <div className="editable-field multiline">
          <span>تم تنفيذ خطة علاجية مركزة على مهارة الاستماع، مع متابعة أداء الطالبات بعد التطبيق.</span>
          <Icon name="edit" size={18} />
        </div>

        <label className="field-label">الأثر المدعوم</label>
        <div className="editable-field multiline">
          <span>أظهر الشاهد وجود متابعة وقياس بعد التنفيذ. يحتاج مقدار التحسن الرقمي إلى تأكيد إذا رغبتِ في إضافته.</span>
          <Icon name="edit" size={18} />
        </div>
      </SectionCard>

      <section className="question-card">
        <div className="question-icon"><Icon name="alert" size={22} /></div>
        <div>
          <span className="eyebrow">معلومة تحتاج تأكيدك</span>
          <h2>هل لديك نتيجة موثقة توضح مقدار التحسن؟</h2>
          <input className="text-input" placeholder="مثال: ارتفعت النتيجة من 62% إلى 78%" />
        </div>
      </section>

      <div className="review-actions">
        <Link href="/portfolio" className="primary-button full-button">
          <Icon name="check" size={20} />
          اعتماد وإضافة لملفي
        </Link>
        <button className="secondary-button full-button">حفظ كمسودة</button>
      </div>
    </AppShell>
  );
}
