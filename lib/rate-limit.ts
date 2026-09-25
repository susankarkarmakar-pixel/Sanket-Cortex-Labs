import { createHash } from "node:crypto";

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);
const MAX_RATE_LIMIT_KEYS = 10_000;
const requestLog = new Map<string, number[]>();

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("The shared rate-limiting service is unavailable.");
    this.name = "RateLimitUnavailableError";
  }
}

export function getClientIdentifier(request: Request): string {
  // Forwarded headers are client-controlled unless the deployment proxy is trusted.
  if (process.env.TRUST_PROXY === "true") {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (forwarded && isSafeIdentifier(forwarded)) return forwarded;
    const realIp = request.headers.get("x-real-ip")?.trim();
    if (realIp && isSafeIdentifier(realIp)) return realIp;
  }
  return "anonymous";
}

export async function enforceRateLimit(clientId: string): Promise<boolean> {
  const backend = process.env.RATE_LIMIT_BACKEND || (process.env.UPSTASH_REDIS_REST_URL ? "upstash" : "memory");
  if (backend === "upstash") return enforceUpstashLimit(clientId);
  if (backend === "memory") return isWithinMemoryRateLimit(clientId);
  throw new RateLimitUnavailableError();
}

export const RATE_LIMIT_RETRY_AFTER_SECONDS = RATE_LIMIT_WINDOW_SECONDS;

async function enforceUpstashLimit(clientId: string): Promise<boolean> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new RateLimitUnavailableError();

  const key = `susan-ai:rate:${createHash("sha256").update(clientId).digest("hex")}`;
  const response = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify([["INCR", key], ["EXPIRE", key, RATE_LIMIT_WINDOW_SECONDS]]),
    signal: AbortSignal.timeout(2_000),
    cache: "no-store",
  }).catch(() => null);
  if (!response?.ok) throw new RateLimitUnavailableError();

  const results = await response.json().catch(() => null) as Array<{ result?: number }> | null;
  const count = results?.[0]?.result;
  if (typeof count !== "number") throw new RateLimitUnavailableError();
  return count <= RATE_LIMIT_MAX_REQUESTS;
}

function isWithinMemoryRateLimit(clientId: string): boolean {
  const now = Date.now();
  if (requestLog.size >= MAX_RATE_LIMIT_KEYS && !requestLog.has(clientId)) {
    for (const [key, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_SECONDS * 1000)) requestLog.delete(key);
    }
  }
  const recent = (requestLog.get(clientId) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_SECONDS * 1000);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(clientId, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(clientId, recent);
  return true;
}

function isSafeIdentifier(value: string): boolean {
  return value.length <= 128 && /^[a-zA-Z0-9:.[\]-]+$/.test(value);
}
