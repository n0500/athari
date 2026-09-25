# DATA MODEL — V2

## users/{uid}
displayName, email, role, updatedAt

## evidence/{evidenceId}
ownerUid, academicYear, status
originalFileName, mimeType, fileSize
driveFileId, driveWebViewLink, driveParentFolderId
aiAnalysis
approvedContent
createdAt, updatedAt, approvedAt

## frameworks/{frameworkId}
name, version, sourceReference, status

## frameworks/{frameworkId}/elements/{elementId}
officialName, description, order, weight, sourceReference

## auditEvents/{eventId}
ownerUid, evidenceId, action, createdAt, metadata

## Drive backup
`athari-backup.json` contains a recoverable index of evidence IDs, Drive file IDs, statuses and approved content.
