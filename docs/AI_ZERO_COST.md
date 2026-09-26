# AI — ZERO COST

Cloudflare Workers AI Free is the default AI engine.

Document reading uses `env.AI.toMarkdown` for supported PDF, images, DOCX and other rich formats.

## Image-only / scanned PDFs

Normal PDFs still use the direct Cloudflare conversion path first.

If a PDF produces no usable analysis, Athari uses a visual fallback:
- PDFium WebAssembly renders up to the first 3 pages locally in the browser.
- This fallback intentionally avoids PDF.js workers because iOS Safari was unreliable in production testing.
- The original PDF remains the source file stored in the teacher's Google Drive.
- Only the temporary rendered image is sent to the existing Athari AI Worker.
- No additional paid service is introduced.

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
