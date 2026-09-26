export type EvidenceStatus =
  | "draft"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "needs_info"
  | "ready_for_review"
  | "approved"
  | "analysis_failed"
  | "archived";

export type ExtractedFact = { fact: string; support?: string };
export type SuggestedClassification = { elementId: string; elementName: string; reason: string };
export type MissingInformation = { question: string; reason?: string } | null;

export type AiAnalysis = {
  extractedFacts: ExtractedFact[];
  suggestedClassifications: SuggestedClassification[];
  draftTitle: string;
  draftDescription: string;
  draftImpact: string;
  missingInformation: MissingInformation;
  warnings: string[];
};

export type ApprovedClassification = {
  elementId: string;
  elementName: string;
  reason?: string;
  isPrimary: boolean;
};

export type ApprovedContent = {
  elementId: string;
  elementName: string;
  classifications?: ApprovedClassification[];
  title: string;
  description: string;
  impact: string;
};

export type EvidenceRecord = {
  id: string;
  ownerUid: string;
  academicYear: string;
  status: EvidenceStatus;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  contentHash?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
  aiAnalysis?: AiAnalysis;
  approvedContent?: ApprovedContent;
  archiveReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  approvedAt?: unknown;
  archivedAt?: unknown;
};

export type FrameworkElement = {
  id: string;
  officialName: string;
  description?: string;
  order?: number;
  sourceReference?: string;
  weightPercent?: number;
  category?: "common" | "role_responsibility" | "additional_assignment";
};
