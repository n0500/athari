# DATA MODEL — Draft

> هذا نموذج أولي. لا يعتمد نهائيًا قبل بدء التنفيذ.

## User
- id
- displayName
- email
- role: teacher | reviewer | admin
- createdAt

## Portfolio
- id
- ownerUserId
- academicYear
- status: active | archived
- createdAt
- updatedAt

## Evidence
- id
- portfolioId
- ownerUserId
- originalFileRef
- originalFileName
- mimeType
- uploadStatus
- reviewStatus: pending | needs_info | ready | approved | rejected
- extractedFacts
- suggestedPerformanceElementId
- approvedPerformanceElementId
- draftTitle
- approvedTitle
- draftDescription
- approvedDescription
- draftImpact
- approvedImpact
- missingInformation
- teacherNotes
- createdAt
- updatedAt
- approvedAt

## PerformanceElement
لا تُدخل أسماء أو أوزان رسمية هنا إلا من مرجع موثق داخل المشروع.
- id
- officialName
- description
- weight
- sourceReference

## AuditEvent
- id
- userId
- evidenceId
- action
- timestamp
- metadata

## قاعدة مهمة
احتفظ دائمًا بالقيم المقترحة منفصلة عن القيم التي اعتمدتها المعلمة.
