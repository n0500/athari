import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { Icon } from "@/components/Icon";

export default function AccountPage() {
  return (
    <AppShell title="الحساب" subtitle="إعداداتك وبيانات ملفك">
      <section className="profile-card">
        <div className="avatar">ن</div>
        <div>
          <h1>نهى المطيري</h1>
          <p>معلمة لغة إنجليزية</p>
        </div>
      </section>

      <div className="settings-list">
        <button><span>بيانات الملف المهني</span><Icon name="chevron" size={18} /></button>
        <button><span>السنة وإطار الأداء</span><Icon name="chevron" size={18} /></button>
        <button><span>الخصوصية والمشاركة</span><Icon name="chevron" size={18} /></button>
        <button><span>المساعدة</span><Icon name="chevron" size={18} /></button>
      </div>

      <Link href="/login" className="secondary-button full-button">تسجيل الخروج التجريبي</Link>
    </AppShell>
  );
}
