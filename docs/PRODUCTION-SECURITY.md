# Susan AI Production Security Configuration

## Browser API keys

Susan AI uses a BYOK model. API keys are sent only with the selected chat request and are not persisted by the server. Settings now defaults to **session-only storage** using `sessionStorage`; users must explicitly opt in to browser persistence. Persisted browser keys are Base64-encoded, not encrypted, so users should use provider-restricted keys and trusted devices.

## Request validation

The chat route validates JSON content type, body size, message count and length, message parts, file MIME/data URLs, provider availability, and provider file capabilities. Error and streaming responses are marked `Cache-Control: no-store`.

## Rate limiting

The repository supports a shared Upstash Redis REST limiter and a bounded in-memory development fallback. The limiter intentionally trusts `x-forwarded-for` and `x-real-ip` only when the deployment sets:

```env
TRUST_PROXY=true
RATE_LIMIT_BACKEND=upstash
RATE_LIMIT_MAX_REQUESTS=30
UPSTASH_REDIS_REST_URL=https://your-database.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-secret-token
```

Do not set `TRUST_PROXY=true` unless the hosting platform strips and rewrites forwarding headers from a trusted edge proxy. Without it, requests use one anonymous bucket, which is safe against spoofed client IPs but not suitable for a public multi-user deployment.

For local development only, use `RATE_LIMIT_BACKEND=memory`. If `RATE_LIMIT_BACKEND=upstash` is selected but credentials are missing or the service is unavailable, the chat route fails closed with `503` rather than silently disabling abuse protection. A hosting provider's native limiter is also acceptable if it runs before the application route.

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

The repository includes an opt-in harness:

```bash
RUN_LIVE_PROVIDER_TESTS=true SUSAN_TEST_PROVIDERS=openai npm run test:providers
```

The harness skips providers without an environment key and reads the production build through the local chat route. It is intentionally not part of the default CI test command because provider calls can consume quota or incur charges.

Windows installer validation must run on a Windows runner. Confirm both NSIS and portable artifacts launch, bind to an available local port, load `/api/health`, and terminate the bundled server on exit.
