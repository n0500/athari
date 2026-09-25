export type EvidenceStatus = "ready" | "needs-info" | "approved";

export type Evidence = {
  id: string;
  title: string;
  element: string;
  date: string;
  status: EvidenceStatus;
  fileName: string;
};

export const evidenceItems: Evidence[] = [
  {
    id: "1",
    title: "تحسين مهارة الاستماع من خلال خطة علاجية",
    element: "تحسين نتائج المتعلمين",
    date: "24 سبتمبر 2026",
    status: "ready",
    fileName: "نتائج_قياس_الاستماع.pdf",
  },
  {
    id: "2",
    title: "توظيف أداة رقمية في المتابعة الأسبوعية",
    element: "توظيف تقنيات التعليم",
    date: "21 سبتمبر 2026",
    status: "needs-info",
    fileName: "تقرير_منجزي.pdf",
  },
  {
    id: "3",
    title: "تنفيذ تعلم تعاوني قائم على أدوار واضحة",
    element: "استراتيجيات التدريس",
    date: "17 سبتمبر 2026",
    status: "approved",
    fileName: "نشاط_التعلم_التعاوني.jpg",
  },
];

export const frameworkElements = [
  { name: "تحسين نتائج المتعلمين", count: 3 },
  { name: "استراتيجيات التدريس", count: 2 },
  { name: "توظيف تقنيات التعليم", count: 2 },
  { name: "التطوير المهني", count: 1 },
  { name: "المشاركة المجتمعية", count: 1 },
];
