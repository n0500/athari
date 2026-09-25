# AI — ZERO COST

Cloudflare Workers AI Free is the default AI engine.

Document reading uses `env.AI.toMarkdown` for supported PDF, images, DOCX and other rich formats.

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
