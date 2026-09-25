# AI ZERO-COST HARDENING

- The root Next.js TypeScript build no longer scans the separate Cloudflare Worker project.
- The Worker accepts current Workers AI response shapes.
- Model output is parsed and sanitized server-side.
- Suggested classifications are filtered against the verified framework supplied by Firestore.
- If no verified framework exists, no classification is returned.
- Thinking is disabled to reduce unnecessary free-tier AI usage.
- Evidence files are converted transiently; no Cloudflare evidence storage is introduced.
