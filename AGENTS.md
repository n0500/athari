# Athari repository instructions

Athari is Arabic-first and mobile-first.

## Zero Cost V2
- Next.js static export on Firebase Hosting.
- Firebase Auth + Firestore on Spark.
- Original evidence stays in each teacher's Google Drive.
- Google Drive access is limited to `drive.file`.
- Cloudflare Worker + Workers AI performs transient conversion and analysis.
- Do not introduce Firebase Storage, Firebase Functions, App Hosting, Blaze, or paid AI APIs by default.

## Core flow
upload -> save original to Drive inbox -> AI transient analysis -> teacher review -> approval -> move Drive file to performance-element folder -> update Firestore -> refresh Drive backup.

## Non-negotiable
- Never invent achievement, impact, result, date, count, or participant data.
- Do not hard-code official performance elements without a verified source.
- AI output is separate from approved content.
- Never store Google OAuth tokens in Firestore.
- Never commit secrets.
