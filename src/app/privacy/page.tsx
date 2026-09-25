import { AppShell } from "@/components/AppShell";

export default function PrivacyPage() {
  return (
    <AppShell
      title="سياسة الخصوصية"
      subtitle="أثري | Athari"
      showNav={false}
    >
      <section className="hero-card">
        <span className="eyebrow">الخصوصية في أثري</span>
        <h1>سياسة الخصوصية</h1>
        <p>
          توضح هذه الصفحة كيف يتعامل تطبيق أثري مع بيانات المستخدم والشواهد
          التي يضيفها داخل التطبيق.
        </p>
      </section>

      <section className="page-section stack">
        <article className="section-card">
          <h2>البيانات التي نستخدمها</h2>
          <p className="muted-copy">
            يستخدم أثري بيانات تسجيل الدخول الأساسية من Google/Firebase
            لتشغيل الحساب. كما يحفظ بيانات تنظيم الشواهد وحالتها ومحتواها
            المعتمد داخل Cloud Firestore.
          </p>
        </article>

        <article className="section-card">
          <h2>ملفات الشواهد</h2>
          <p className="muted-copy">
            تحفظ ملفات الشواهد الأصلية في Google Drive الخاص بالمستخدم.
            يطلب أثري صلاحية محدودة من نوع drive.file للوصول إلى الملفات
            التي ينشئها التطبيق أو يختارها المستخدم لاستخدامها معه.
          </p>
        </article>

        <article className="section-card">
          <h2>التحليل بالذكاء الاصطناعي</h2>
          <p className="muted-copy">
            قد يرسل أثري محتوى الشاهد مؤقتًا إلى خدمة التحليل اللازمة
            لاستخراج معلومات قابلة للمراجعة. لا يعتمد أثري أي صياغة أو
            تصنيف نهائي قبل مراجعة المستخدم وموافقته.
          </p>
        </article>

        <article className="section-card">
          <h2>مشاركة البيانات</h2>
          <p className="muted-copy">
            لا يبيع أثري بيانات المستخدمين. وتستخدم الخدمات المرتبطة
            بالتطبيق فقط لتسجيل الدخول، وحفظ البيانات، وحفظ الشواهد،
            وتشغيل التحليل اللازم لوظائف التطبيق.
          </p>
        </article>

        <article className="section-card">
          <h2>حماية الحساب</h2>
          <p className="muted-copy">
            يجب على المستخدم المحافظة على أمان حساب Google الخاص به.
            الوصول إلى بيانات أثري في Firestore مقيد بالمستخدم المسجل
            وصاحب البيانات وفق قواعد الأمان المطبقة في المشروع.
          </p>
        </article>

        <article className="section-card">
          <h2>التواصل</h2>
          <p className="muted-copy">
            للاستفسارات المتعلقة بالخصوصية أو البيانات:{" "}
            <a className="text-link" href="mailto:t.nuha0500@gmail.com">
              t.nuha0500@gmail.com
            </a>
          </p>
        </article>
      </section>
    </AppShell>
  );
}
