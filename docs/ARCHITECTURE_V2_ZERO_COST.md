# ARCHITECTURE V2 — ZERO COST

## Stack
GitHub + Firebase Hosting/Auth/Firestore + Google Drive + Cloudflare Worker + Workers AI Free.

## No-cost rule
No Firebase Storage, Cloud Functions, App Hosting, Blaze, or paid AI API in the default path.

## Evidence lifecycle
- upload to teacher Drive inbox
- save only Drive IDs and metadata in Firestore
- Worker verifies Firebase ID token
- Worker converts document to Markdown
- Workers AI returns structured analysis
- teacher reviews
- approved file moves to the approved performance-element folder
- Firestore updates
- athari-backup.json updates in Drive

## Cost guards
- 10 MB file limit
- 120,000 character AI input cap
- when the daily Workers AI free allocation is exhausted, analysis fails safely; the original remains in Drive
