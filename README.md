<div align="center">
  <img src="public/susan-logo.svg" alt="Susan AI Logo" width="150" />
  <h1>Susan AI</h1>
  <p><strong>Private multi-model AI chat with Bring Your Own Key support</strong></p>
  <p>An intelligent chat workspace by Sanket Pixel Technologies.</p>
</div>

## Product overview

Susan AI provides one chat interface for DeepSeek, Claude, Hugging Face, Gemini, OpenAI, Qwen, Kimi, Manus, and Sarvam integrations. Conversations are persisted locally in the browser, and users can export or import their chat history as JSON.

## Features

- Browser-local BYOK storage with clear-key controls.
- Streaming responses through the Vercel AI SDK.
- Markdown, tables, links, and syntax-highlighted code blocks.
- Responsive desktop and mobile layout.
- Conversation autosave, history search surface, JSON export/import, and clear-history controls.
- Request validation, provider-safe error messages, rate limiting, request-size limits, and secure default HTTP headers.
- `GET /api/health` deployment smoke-test endpoint.

## Requirements

- Node.js 20 or newer.
- An API key for at least one supported provider.

## Local development

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), open **Settings**, add a provider key, select that provider, and send a message.

## Production validation

```bash
npm run lint
npm run build
npm start
```

Once the server is running, verify the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Expected response:

```json
{"status":"ok","service":"susan-ai"}
```

## Data and security model

API keys are stored in the browser's `localStorage` using Base64 encoding. Base64 is **not encryption**, so do not use this feature on shared or compromised devices. Keys are not persisted by Susan AI, but the selected key is sent through the app's `/api/chat` route for each request and then forwarded to the selected provider. Use provider-restricted keys with the minimum permissions and rotate them if a device is lost.

Conversation history also stays in browser storage unless the user exports it. Exported JSON files contain message content and should be treated as sensitive data.

The built-in rate limit is an application-level baseline for single-instance deployments. For production behind multiple instances, add a shared limiter such as Redis or the hosting platform's edge rate limiting.

## Supported providers

Provider endpoints and model identifiers are defined in `lib/ai-providers.ts`. Verify current provider model names and account availability before enabling a provider in a public release, especially for integrations whose API compatibility changes frequently.

## License

MIT
