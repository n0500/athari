# AI — ZERO COST

Cloudflare Workers AI Free is the default AI engine.

Document reading uses `env.AI.toMarkdown` for supported PDF, images, DOCX and other rich formats.

For image-only or scanned PDFs:
- Athari first tries the original PDF normally.
- If the result is unreadable or empty, the browser renders up to the first 3 pages locally using PDF.js.
- Only a temporary JPEG contact sheet is sent to the existing Workers AI endpoint for analysis.
- The original PDF remains the source file stored in the teacher's Google Drive.
- The fallback is used only when needed so normal text PDFs keep the cheaper/faster path.

Default model:
`@cf/google/gemma-4-26b-a4b-it`

Structured output:
- extractedFacts
- suggestedClassifications
- draftTitle
- draftDescription
- draftImpact
- missingInformation
- warnings

If no verified performance framework exists, classifications must be empty.
