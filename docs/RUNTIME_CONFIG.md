# Runtime configuration

Athari now has production-safe public fallbacks for the Firebase Web SDK
configuration and the public Cloudflare Worker endpoint.

These values are intentionally client-visible:
- Firebase Web API key/config values used by the browser SDK
- Public Worker URL

Environment variables still override the built-in fallbacks when present.
No service-account key, private key, OAuth client secret, or other server
credential is stored in the repository.
