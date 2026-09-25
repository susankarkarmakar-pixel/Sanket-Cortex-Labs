# Susan AI Production Security Configuration

## Browser API keys

Susan AI uses a BYOK model. API keys are sent only with the selected chat request and are not persisted by the server. Settings now defaults to **session-only storage** using `sessionStorage`; users must explicitly opt in to browser persistence. Persisted browser keys are Base64-encoded, not encrypted, so users should use provider-restricted keys and trusted devices.

## Request validation

The chat route validates JSON content type, body size, message count and length, message parts, file MIME/data URLs, provider availability, and provider file capabilities. Error and streaming responses are marked `Cache-Control: no-store`.

## Rate limiting

The repository includes a bounded in-memory limiter as a single-instance baseline. The limiter intentionally trusts `x-forwarded-for` and `x-real-ip` only when the deployment sets:

```env
TRUST_PROXY=true
RATE_LIMIT_MAX_REQUESTS=30
```

Do not set `TRUST_PROXY=true` unless the hosting platform strips and rewrites forwarding headers from a trusted edge proxy. Without it, requests use one anonymous bucket, which is safe against spoofed client IPs but not suitable for a public multi-user deployment.

For multi-instance production, configure the hosting provider's native rate limiter or replace the in-memory implementation with a shared Redis/Upstash-backed limiter before public launch. The current implementation must not be represented as a globally shared production limiter.

## Release gates

Every release should pass:

```bash
npm run lint
npx tsc --noEmit
npm audit --audit-level=high
npm run build
npm test
```

Live provider testing must be performed separately with restricted, low-quota test keys. Never commit provider keys to the repository or place them in automated logs.
