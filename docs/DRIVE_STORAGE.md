# GOOGLE DRIVE STORAGE

Structure:

أثري/
- 1448هـ/
  - 00 - قيد المراجعة/
  - <عنصر الأداء>/
- athari-backup.json

Drive stores the original evidence.
Firestore stores the fast index and approved metadata.

Scope:
`https://www.googleapis.com/auth/drive.file`

OAuth access tokens are session-only and are never stored in Firestore.
