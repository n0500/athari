import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./athari-v2.css";
import "./athari-v4.css";
import "./share-v5.css";
import "./athari-final.css";
import "./athari-premium.css";
import "./athari-mockup.css";
import "./athari-v7.css";
import "./athari-themes.css";
import "./athari-share-motion.css";
import { ThemeRuntime } from "@/components/athari-theme/ThemeRuntime";

export const metadata: Metadata = {
  title: "أثري | ملف الأداء المهني",
  description: "تنظيم شواهد الأداء المهني للمعلمة وفق عناصر التقييم الرسمية.",
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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&family=Amiri:wght@400;700&display=swap"
        />
      </head>
      <body><ThemeRuntime />{children}</body>
    </html>
  );
}
