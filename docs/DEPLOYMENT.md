# DEPLOYMENT — ZERO COST

## Web app
The Next.js app uses `output: "export"` and produces the `out/` directory.

Target:
Firebase Hosting on the Spark plan.

## Repository update flow
`Athari-updates.zip` is uploaded to the repository root.
The existing GitHub workflow validates and applies it.

## Hosting deployment
A separate GitHub Actions deployment workflow will build the static app in GitHub's cloud runner and deploy `out/` to Firebase Hosting.

This build may use Node.js inside GitHub Actions. It does not require Node.js or Firebase CLI on the user's device.

## AI
The Cloudflare Worker is deployed separately once, then updated from its source folder.

## Required one-time account configuration
- Firebase Web App public config
- Firebase Google Authentication
- Firestore and rules
- Google Drive API + OAuth consent with `drive.file`
- Cloudflare Worker AI binding
- Firebase project ID and allowed web origin in the Worker
