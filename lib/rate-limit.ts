const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 30);
const MAX_RATE_LIMIT_KEYS = 10_000;
const requestLog = new Map<string, number[]>();

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

export function isWithinRateLimit(clientId: string): boolean {
  const now = Date.now();
  if (requestLog.size >= MAX_RATE_LIMIT_KEYS && !requestLog.has(clientId)) {
    for (const [key, timestamps] of requestLog) {
      if (timestamps.every((timestamp) => now - timestamp >= RATE_LIMIT_WINDOW_MS)) requestLog.delete(key);
    }
  }
  const recent = (requestLog.get(clientId) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(clientId, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(clientId, recent);
  return true;
}

export const RATE_LIMIT_RETRY_AFTER_SECONDS = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);

function isSafeIdentifier(value: string): boolean {
  return value.length <= 128 && /^[a-zA-Z0-9:.[\]-]+$/.test(value);
}
