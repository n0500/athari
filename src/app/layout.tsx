import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./athari-v2.css";
import "./athari-v4.css";
import "./share-v5.css";

export const metadata: Metadata = {
  title: "أثري | ملف الأداء الذكي",
  description: "منصة ذكية لتنظيم شواهد الأداء المهني للمعلمة.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f8fbff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
