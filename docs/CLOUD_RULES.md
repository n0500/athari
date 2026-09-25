# Cloud-first engineering note

Athari must remain cloud-first:
- Do not require a local laptop, local Node.js, local Firebase CLI, or a long-running local server for normal development/deployment.
- GitHub is the source of truth.
- The update workflow only applies repository updates.
- Build/deploy must run in a managed cloud service connected to `main`.
- Backend/AI secrets are server-side only.
- Do not expose provider keys in browser code or committed files.
