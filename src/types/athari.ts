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
export type SuggestedClassification = {
  elementId: string;
  elementName: string;
  reason: string;
  /** Mandatory follow-up items directly supported by the evidence. Final approval stays with the teacher. */
  requirementIds?: string[];
};
export type MissingInformation = { question: string; reason?: string } | null;

export type AiAnalysis = {
  extractedFacts: ExtractedFact[];
  suggestedClassifications: SuggestedClassification[];
  draftTitle: string;
  draftDescription: string;
  draftImpact: string;
  /** One sentence that highlights the teacher's effort, from documented facts only. */
  draftHighlight?: string;
  missingInformation: MissingInformation;
  warnings: string[];
  unreadableFiles?: string[];
};

export type ApprovedClassification = {
  elementId: string;
  elementName: string;
  reason?: string;
  isPrimary: boolean;
  /** Mandatory follow-up items confirmed by the teacher as documented by this evidence. */
  requirementIds?: string[];
};

export type ApprovedContent = {
  elementId: string;
  elementName: string;
  classifications?: ApprovedClassification[];
  title: string;
  description: string;
  impact: string;
  /** Teacher-approved sentence that highlights the effort behind the evidence. */
  highlight?: string;
};

export type EvidenceAttachment = {
  /** Stable id for this attachment inside its evidence record. */
  attachmentId?: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  contentHash?: string;
  driveFileId?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
  /** athari_upload = copied into Athari folders; drive_link = stays in the teacher's selected Drive location. */
  sourceKind?: "athari_upload" | "drive_link";
  /** Optional semantic role. Existing attachments without this field remain original evidence. */
  purpose?: "supporting_image";
};

export type DriveSourceLink = {
  kind: "file" | "folder";
  id: string;
  name: string;
  webViewLink?: string;
};

export type EvidenceRecord = {
  id: string;
  ownerUid: string;
  academicYear: string;
  status: EvidenceStatus;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  fileCount?: number;
  contentHash?: string;
  attachments?: EvidenceAttachment[];
  driveFileId?: string;
  driveWebViewLink?: string;
  driveParentFolderId?: string;
  aiAnalysis?: AiAnalysis;
  approvedContent?: ApprovedContent;
  driveSource?: DriveSourceLink;
  archiveReason?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  approvedAt?: unknown;
  archivedAt?: unknown;
};

export type FrameworkRequirement = {
  id: string;
  label: string;
};

export type FrameworkElement = {
  id: string;
  officialName: string;
  description?: string;
  order?: number;
  sourceReference?: string;
  weightPercent?: number;
  category?: "common" | "role_responsibility" | "additional_assignment";
  requirements?: FrameworkRequirement[];
};

export type ProfessionalDocumentKind = "license" | "timetable" | "curriculum" | "other";

/** A standing document (license, timetable…) kept once in the teacher's profile. */
export type ProfessionalDocument = {
  id: string;
  kind: ProfessionalDocumentKind;
  label: string;
  originalFileName: string;
  mimeType: string;
  driveFileId: string;
  driveWebViewLink?: string;
};

export type ProfessionalProfile = {
  fullName: string;
  specialization: string;
  qualification: string;
  university: string;
  employer: string;
  school: string;
  educationDepartment: string;
  /** Name of the school principal, shown at the foot of evidence reports. */
  principalName?: string;
  professionalRank: string;
  experience: string;
  professionalLicense: string;
  bio: string;
  /** The teacher's own educational vision and mission. */
  vision?: string;
  mission?: string;
  achievements: string[];
  developmentGoals: string[];
};
