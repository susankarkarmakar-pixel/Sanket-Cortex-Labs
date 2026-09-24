import { convertToModelMessages, streamText } from "ai";
import { getModelConfig, ModelProvider } from "@/lib/ai-providers";
import { NextResponse } from "next/server";

const PROVIDERS: ModelProvider[] = ["deepseek", "anthropic", "huggingface", "google", "openai", "qwen", "kimi", "manus", "sarvam", "openrouter"];
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 100_000;
const MAX_BODY_BYTES = 20_000_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const requestLog = new Map<string, number[]>();

export async function POST(req: Request) {
  try {
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError("Request is too large. Keep attachments under 20 MB total.", 413);
    const clientId = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    if (!isWithinRateLimit(clientId)) return jsonError("Too many requests. Please wait a moment and try again.", 429);

    const body: unknown = await req.json();
    if (!body || typeof body !== "object") return jsonError("Invalid request body.", 400);
    const { messages, provider, apiKey } = body as { messages?: unknown; provider?: unknown; apiKey?: unknown };
    if (typeof provider !== "string" || !PROVIDERS.includes(provider as ModelProvider)) return jsonError("Unsupported model provider.", 400);
    if (typeof apiKey !== "string" || apiKey.trim().length < 8 || apiKey.length > 500) return jsonError("A valid API key is required.", 400);
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return jsonError("Messages must contain between 1 and 100 items.", 400);

    const validMessages = messages.filter(isUIMessage).slice(-MAX_MESSAGES);
    if (validMessages.length === 0) return jsonError("No valid messages found.", 400);

    const modelMessages = validMessages.some((message) => Array.isArray(message.parts))
      ? await convertToModelMessages(validMessages as never)
      : validMessages
          .filter((message) => typeof message.content === "string" && message.content.length <= MAX_MESSAGE_LENGTH)
          .map((message) => ({ role: message.role, content: message.content as string }));
    if (modelMessages.length === 0) return jsonError("No valid message content found.", 400);

    const model = getModelConfig(provider as ModelProvider, apiKey.trim());
    const result = streamText({ model, messages: modelMessages });
    const anyResult = result as unknown as { toUIMessageStreamResponse?: (options?: { onError?: (error: unknown) => string }) => Response; toDataStreamResponse?: () => Response; toTextStreamResponse?: () => Response };
    return anyResult.toUIMessageStreamResponse?.({ onError: providerStreamError }) ?? anyResult.toDataStreamResponse?.() ?? anyResult.toTextStreamResponse?.() ?? jsonError("Streaming is unavailable.", 500);
  } catch (error: unknown) {
    console.error("API Chat Error:", error);
    const err = error as Record<string, unknown>;
    const status = typeof err.status === "number" ? err.status : 500;
    const rawMessage = typeof err.message === "string" ? err.message : "";
    const message = rawMessage.toLowerCase();
    if (rawMessage.includes("asynchronous") || rawMessage.includes("instant chat")) return jsonError(rawMessage, 400);
    if (status === 401 || status === 403) return jsonError("The API key was rejected by the provider.", 401);
    if (status === 429) return jsonError("The provider rate limit or quota was exceeded.", 429);
    if (status === 402 || message.includes("credit") || message.includes("balance")) return jsonError("The provider account has insufficient credits.", 402);
    if (message.includes("loading") || message.includes("queue")) return jsonError("The model is currently busy. Please try again shortly.", 503);
    return jsonError(rawMessage && rawMessage.length < 240 ? rawMessage : "The provider could not complete this request. Check your key, model quota, and provider status.", 502);
  }
}

function isUIMessage(value: unknown): value is { role: "user" | "assistant"; parts?: unknown[]; content?: unknown } {
  if (!value || typeof value !== "object") return false;
  const message = value as { role?: unknown; parts?: unknown; content?: unknown };
  return (message.role === "user" || message.role === "assistant") && (Array.isArray(message.parts) || typeof message.content === "string");
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function providerStreamError(error: unknown): string {
  const candidate = error as { status?: number; message?: string; responseBody?: string };
  const status = candidate?.status;
  const raw = typeof candidate?.message === "string" ? candidate.message.toLowerCase() : "";
  if (status === 401 || status === 403 || raw.includes("invalid api key") || raw.includes("unauthorized") || raw.includes("forbidden")) return "The API key was rejected. Check that you copied the provider key correctly and that it is active.";
  if (status === 402 || raw.includes("credit") || raw.includes("balance") || raw.includes("quota")) return "The provider quota or credits are exhausted. Check the provider dashboard.";
  if (status === 404 || raw.includes("model") || raw.includes("not found")) return "This model is unavailable for the selected provider. Try another model or provider.";
  if (status === 429 || raw.includes("rate limit") || raw.includes("too many")) return "The provider rate limit was reached. Please wait and try again.";
  return "The provider could not complete the request. Check the API key, model access, and provider status.";
}

function isWithinRateLimit(clientId: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(clientId) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(clientId, recent);
    return false;
  }
  recent.push(now);
  requestLog.set(clientId, recent);
  return true;
}
