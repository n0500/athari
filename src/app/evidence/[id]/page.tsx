import Link from "next/link";
import { AppShell } from "@/components/AppShell";

export function generateStaticParams() {
  return [{ id: "1" }, { id: "2" }, { id: "3" }];
}

export default async function LegacyEvidencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AppShell title="مراجعة الشاهد">
      <section className="section-card">
        <h2>تم تحديث مسار المراجعة</h2>
        <p className="muted-copy">
          استخدمي شاشة المراجعة الجديدة المرتبطة بـ Firestore وGoogle Drive.
        </p>
        <Link
          className="primary-button full-button"
          href={`/evidence/review?id=${encodeURIComponent(id)}`}
        >
          فتح المراجعة الجديدة
        </Link>
      </section>
    </AppShell>
  );
}
