# Susan AI Production Readiness

## Completed in the current release

Susan AI now includes persistent, versioned application preferences for default provider, response language, auto-save, streaming, notifications, compact mode and startup behavior. The Settings dashboard exposes these controls, the selected response language is applied at the chat API boundary, and conversation auto-save respects the saved preference.

The provider dashboard shows each instant-chat provider, its configured-key readiness, model identifier, streaming support and file/vision capabilities. Attachment input supports duplicate protection, per-file and total-size limits, drag-and-drop, removal controls and live validation messaging.

The repository has passing lint, TypeScript, production build, audit and runtime smoke-test gates. The Windows workflow runs the same checks before attempting NSIS and portable artifacts.

## Required deployment configuration

For a public deployment, configure a shared limiter rather than the development memory backend:

```env
RATE_LIMIT_BACKEND=upstash
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_MAX_REQUESTS=30
TRUSTED_PROXY_COUNT=1
```

Do not commit provider API keys, Upstash tokens or deployment secrets. Browser API keys remain BYOK credentials and should be restricted to the minimum provider permissions required.

## Release verification

Run the following before publishing a web release:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm audit --audit-level=high
npm run build
npm test
```

The Windows workflow in `.github/workflows/windows-release.yml` performs these checks on `windows-latest` and builds NSIS and portable artifacts for version tags. Windows installer verification must be performed by the GitHub Actions Windows runner or a real Windows machine. Linux packaging cannot complete the Windows signing/NSIS stage without Wine; the project icon is nevertheless configured at a Windows-compatible 256px resolution.

## Live provider validation

Live provider tests are opt-in and must be run only with explicit test credentials and a quota budget:

```bash
RUN_LIVE_PROVIDER_TESTS=true SUSAN_TEST_PROVIDERS=openai npm run test:providers
```

Repeat for each provider that will be advertised in a deployment. Verify valid streaming, invalid-key handling, provider quota errors, timeout behavior and file/vision capability boundaries. The default CI test suite intentionally does not make external provider calls.

## Remaining operational checks

Before calling a deployment production-ready, verify HTTPS, domain routing, health monitoring, error monitoring with redacted logs, secret rotation, rollback, backup/export guidance and a documented support contact. Exercise the Settings modal at mobile widths and with keyboard-only navigation after each major UI change.
