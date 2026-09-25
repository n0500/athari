# AI ZERO-COST HARDENING

- Gemma 4 26B A4B remains the free-plan model target.
- Thinking is disabled to reduce unnecessary AI usage.
- The Worker accepts current Workers AI response shapes.
- Model output is parsed and sanitized server-side.
- Suggested classifications are filtered against the verified framework supplied by Firestore.
- If no verified framework exists, the Worker returns no classification.
- Evidence file is converted transiently; no Cloudflare evidence storage is introduced.
