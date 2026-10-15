"use client";
import { PortfolioPresentation } from "@/components/PortfolioPresentation";
import { OFFICIAL_TEACHER_FRAMEWORK_V2 } from "@/data/official-teacher-framework";
import type { PortfolioShare } from "@/lib/portfolioShare";

const element = OFFICIAL_TEACHER_FRAMEWORK_V2[0];
const fixture: PortfolioShare = {
  id: "ui-test-only", ownerUid: "ui-test-only", ownerDisplayName: "اختبار الواجهة",
  academicYear: "1448هـ", active: false, documents: [], drivePermissions: [],
  evidence: [1, 2].map((n) => ({
    id: "ui-test-" + n, title: "شاهد اختبار " + n, description: "بيانات اختبار الواجهة فقط",
    impact: "", classifications: [{ elementId: element.id, elementName: element.officialName, isPrimary: true, requirementIds: [] }],
    attachments: [{ originalFileName: "مرفق اختبار.pdf", mimeType: "application/pdf", driveFileId: "ui-test-only" }],
  })),
};
export function PrincipalPortfolioPreview() {
  return <PortfolioPresentation share={fixture} allowDownload />;
}
