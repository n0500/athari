# Athari repository instructions

## Product
Athari (أثري) is an Arabic-first, mobile-first professional performance evidence assistant for teachers.

Core flow:
upload original evidence -> extract facts -> suggest performance element -> draft title/description/impact -> ask only for missing essential facts -> preview -> teacher approval -> add to portfolio.

## Architecture V1
- Next.js App Router + TypeScript.
- Firebase App Hosting for cloud build/deploy from GitHub `main`.
- Firebase Authentication.
- Cloud Firestore.
- Cloud Storage for Firebase.
- AI calls only from secure server-side routes through a provider adapter.
- GitHub Actions only applies `Athari-updates.zip`; it is not the application build/deploy system.
- No local laptop, local Node, or local Firebase CLI is required for normal operation/deployment.

## Non-negotiable behavior
- Never invent an achievement, impact, result, date, participant count, or evidence.
- Separate extracted facts from AI suggestions.
- If evidence is insufficient, ask one concise question instead of guessing.
- Preserve the original uploaded file.
- Nothing enters the final portfolio without explicit teacher approval.
- Do not hard-code official performance-element names, weights, or scoring unless they exist in a verified project source file.
- Never present AI confidence as an official performance score.

## UX
- Arabic and RTL first.
- Mobile-first.
- Large readable typography and low visual clutter.
- One obvious primary action per screen.
- Original evidence must always be reachable from the review screen.
- AI suggestions must be visually distinguishable from teacher-approved values.

## Engineering
- Keep modules small and typed.
- Never commit secrets, API keys, service-account files, or private user data.
- Validate file type, file size, ownership, and authorization.
- Use least-privilege Firebase Security Rules.
- Keep performance frameworks/versioned criteria as data, not hard-coded UI constants.
- Prefer idempotent server operations for evidence analysis.

## Working style
- Read README.md, docs/ARCHITECTURE_V1.md, docs/PRODUCT.md, and docs/UI_V1.md before major changes.
- For broad tasks, inspect the existing code before editing.
- Make the smallest coherent change that completes the task.
- Do not replace working features merely to change style.
