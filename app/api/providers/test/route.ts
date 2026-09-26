import { generateText } from "ai";
import { NextResponse } from "next/server";
import { getCustomModelConfig, getModelConfig, isInstantChatProvider, ModelProvider } from "@/lib/ai-providers";
import { CustomProvider, isAllowedBaseUrl } from "@/lib/custom-providers";
import { enforceRateLimit, getClientIdentifier, RateLimitUnavailableError, RATE_LIMIT_RETRY_AFTER_SECONDS } from "@/lib/rate-limit";

const MAX_BODY_BYTES = 16_000;

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return jsonError("Content-Type must be application/json.", 415);
    const length = Number(request.headers.get("content-length") || 0);
    if (length > MAX_BODY_BYTES) return jsonError("Request is too large.", 413);
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body) || new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) return jsonError("Invalid request body.", 400);
    const input = body as Record<string, unknown>;
    const provider = typeof input.provider === "string" ? input.provider : "";
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    if (apiKey.length < 8 || apiKey.length > 500) return jsonError("A valid provider API key is required.", 400);
    if (!(await enforceRateLimit(getClientIdentifier(request)))) return jsonError("Too many provider tests. Please wait and try again.", 429, { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS) });

    const isCustom = provider.startsWith("custom_");
    let model;
    if (isCustom) {
      if (!isValidCustomProvider(input.customProvider, provider)) return jsonError("Custom provider configuration is invalid.", 400);
      model = getCustomModelConfig(input.customProvider, apiKey);
    } else {
      if (!isInstantChatProvider(provider)) return jsonError("This provider does not support an instant connection test.", 400);
      model = getModelConfig(provider as ModelProvider, apiKey);
    }

    await generateText({
      model,
      prompt: "Reply with the single word OK.",
      maxOutputTokens: 2,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(15_000),
    });
    return NextResponse.json({ ok: true, message: "Provider connection verified." }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) return jsonError("Security rate limiting is temporarily unavailable. Try again shortly.", 503, { "Retry-After": "30" });
    const candidate = error as { status?: number; message?: string };
    const status = candidate?.status;
    const raw = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
    if (status === 401 || status === 403 || raw.includes("unauthorized") || raw.includes("invalid api key") || raw.includes("authentication")) return jsonError("Connection failed: provider rejected this key. Check that it is correct, active, and has model access.", 401);
    if (status === 429 || raw.includes("rate limit") || raw.includes("quota")) return jsonError("Connection failed: provider rate limit or quota was reached. Try later or check the provider dashboard.", 429, { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS) });
    if (status === 402 || raw.includes("insufficient credit") || raw.includes("billing")) return jsonError("Connection failed: provider account reports a billing or credit issue.", 402);
    if (status === 404 || raw.includes("model not found") || raw.includes("not found")) return jsonError("Connection failed: the configured model is unavailable for this provider key.", 400);
    if (raw.includes("timeout") || raw.includes("abort")) return jsonError("Connection test timed out. Check the network and try again.", 504);
    return jsonError("Connection failed. Check the provider key, model access, quota, and provider status.", 502);
  }
}

function isValidCustomProvider(value: unknown, expectedId: string): value is CustomProvider {
  if (!value || typeof value !== "object") return false;
  const provider = value as Partial<CustomProvider>;
  return provider.id === expectedId && typeof provider.name === "string" && provider.name.length <= 100 && typeof provider.model === "string" && provider.model.length > 0 && provider.model.length <= 200 && typeof provider.baseUrl === "string" && isAllowedBaseUrl(provider.baseUrl);
}

function jsonError(error: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}
