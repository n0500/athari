import Link from "next/link";
import { Icon } from "@/components/Icon";

export default function LoginPage() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand-large">أ</div>
        <span className="eyebrow">أثري</span>
        <h1>ملف أداء أوضح، بشواهدك الحقيقية</h1>
        <p>حوّلي شواهدك إلى ملف منظم وموثق، مع بقاء القرار النهائي بيدك.</p>

        <label className="field-label" htmlFor="email">البريد الإلكتروني</label>
        <input id="email" className="text-input" type="email" placeholder="name@example.com" />

        <label className="field-label" htmlFor="password">كلمة المرور</label>
        <input id="password" className="text-input" type="password" placeholder="••••••••" />

        <Link href="/" className="primary-button full-button">
          دخول
          <Icon name="chevron" size={18} />
        </Link>
        <p className="auth-note">نسخة واجهة تجريبية — سيتم ربط تسجيل الدخول الحقيقي في مرحلة Firebase.</p>
      </div>
    </main>
  );
}
