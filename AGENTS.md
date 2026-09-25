# Athari repository instructions

## Product
Athari (أثري) is an Arabic-first professional performance evidence assistant for teachers.

Core flow:
upload original evidence -> extract facts -> suggest performance element -> draft title/description/impact -> ask only for missing essential facts -> preview -> teacher approval -> add to portfolio.

## Non-negotiable behavior
- Never invent an achievement, impact, result, date, participant count, or evidence.
- Separate extracted facts from AI suggestions.
- If evidence is insufficient, ask one concise question instead of guessing.
- Preserve the original uploaded file.
- Nothing enters the final portfolio without explicit teacher approval.
- Do not hard-code official performance-element names, weights, or scoring unless they exist in a verified project source file.

## UX
- Arabic and RTL first.
- Mobile-first.
- Large readable typography and low visual clutter.
- Keep the main action obvious on every screen.
- Avoid decorative complexity.

## Engineering
- Prefer TypeScript.
- Keep modules small and typed.
- Add or update docs when behavior or data shape changes.
- Never commit secrets, API keys, service-account files, or private user data.
- AI provider calls must be server-side or through a secure backend boundary.
- Validate uploaded file type/size and authorization before processing.
- Use least-privilege access rules.

## Working style
- Read README.md and docs/PRODUCT.md before major changes.
- For broad tasks, inspect the existing code before editing.
- Make the smallest coherent change that completes the task.
- Run available checks/tests before declaring completion.
- Do not replace working features merely to change style.
