import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { test, before, after } from "node:test";

const enabled = process.env.RUN_LIVE_PROVIDER_TESTS === "true";
const providers = (process.env.SUSAN_TEST_PROVIDERS || "openai").split(",").map((provider) => provider.trim()).filter(Boolean);
const keys = {
  deepseek: process.env.DEEPSEEK_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  huggingface: process.env.HUGGINGFACE_API_KEY,
  google: process.env.GOOGLE_API_KEY,
  openai: process.env.OPENAI_API_KEY,
  qwen: process.env.QWEN_API_KEY,
  kimi: process.env.KIMI_API_KEY,
  sarvam: process.env.SARVAM_API_KEY,
  openrouter: process.env.OPENROUTER_API_KEY,
};
const port = 3124;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

if (enabled) {
  before(async () => {
    const nextCommand = process.platform === "win32" ? "node_modules/.bin/next.cmd" : "node_modules/.bin/next";
    server = spawn(nextCommand, ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production", RATE_LIMIT_BACKEND: "memory" },
    });
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      try {
        if ((await fetch(`${baseUrl}/api/health`)).ok) return;
      } catch {
        // Server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    throw new Error("Production server did not become ready for live provider tests.");
  });

  after(async () => {
    if (!server || server.exitCode !== null) return;
    server.kill("SIGTERM");
    await Promise.race([once(server, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);
    if (server.exitCode === null) server.kill("SIGKILL");
  });
}

for (const provider of providers) {
  test(`live streaming provider check: ${provider}`, { skip: !enabled || !keys[provider] }, async () => {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider,
        apiKey: keys[provider],
        messages: [{ role: "user", content: "Reply with exactly: Susan AI live test passed." }],
      }),
    });
    assert.equal(response.status, 200, `${provider} returned HTTP ${response.status}`);
    assert.ok(response.body, `${provider} did not return a streaming body`);
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += decoder.decode(value).length;
      if (bytes > 256) {
        await reader.cancel();
        break;
      }
    }
    assert.ok(bytes > 0, `${provider} returned an empty stream`);
  });
}
