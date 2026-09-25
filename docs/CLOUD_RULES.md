# CLOUD RULES

Athari is cloud-first and zero-cost-first.

- No local laptop is required for normal operation.
- GitHub is the source of truth.
- GitHub Actions applies update packages and later deploys the static build.
- Firebase Hosting serves only the static web app.
- Firebase Auth and Firestore stay on Spark.
- Evidence binaries live in each teacher's Google Drive, never Firebase Storage.
- Google Drive scope stays limited to `drive.file`.
- AI runs in a Cloudflare Worker with Workers AI Free.
- When a free quota is exhausted, fail safely; never auto-upgrade or auto-bill.
- Secrets never appear in browser code or GitHub.
