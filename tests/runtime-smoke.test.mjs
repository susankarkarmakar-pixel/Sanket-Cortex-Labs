import assert from "node:assert/strict";
import { once } from "node:events";
import { spawn } from "node:child_process";
import { test, before, after } from "node:test";

const port = 3123;
const baseUrl = `http://127.0.0.1:${port}`;
let server;

before(async () => {
  const nextCommand = process.platform === "win32" ? "node_modules/.bin/next.cmd" : "node_modules/.bin/next";
  server = spawn(nextCommand, ["start", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "production" },
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      // The Next.js server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const output = `${server.stdout.read() || ""}${server.stderr.read() || ""}`;
  throw new Error(`Production server did not become ready.\n${output}`);
});

after(async () => {
  if (!server || server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([
    once(server, "exit"),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
  if (server.exitCode === null) server.kill("SIGKILL");
});

test("health endpoint responds successfully", async () => {
  const response = await fetch(`${baseUrl}/api/health`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("chat route rejects non-JSON requests", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "not-json",
  });
  assert.equal(response.status, 415);
  assert.deepEqual(await response.json(), { error: "Content-Type must be application/json." });
});

test("chat route rejects async-only providers", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "manus",
      apiKey: "placeholder-key",
      messages: [{ role: "user", content: "test" }],
    }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "This provider is not available for instant chat." });
});

test("chat route rejects malformed message parts", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      provider: "openai",
      apiKey: "placeholder-key",
      messages: [{ role: "user", parts: [{ type: "file", mediaType: "application/octet-stream", filename: "bad.bin", url: "data:application/octet-stream;base64,AAAA" }] }],
    }),
  });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "No valid messages found." });
});

test("chat errors are not cacheable", async () => {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ provider: "openai", apiKey: "short", messages: [] }),
  });
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
