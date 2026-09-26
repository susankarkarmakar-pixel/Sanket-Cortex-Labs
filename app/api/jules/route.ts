import { NextResponse } from "next/server";
import { enforceRateLimit, getClientIdentifier, RateLimitUnavailableError, RATE_LIMIT_RETRY_AFTER_SECONDS } from "@/lib/rate-limit";

const JULES_API_BASE = "https://jules.googleapis.com/v1alpha";
const MAX_BODY_BYTES = 64_000;
const MAX_PROMPT_LENGTH = 20_000;
const SOURCE_PATTERN = /^sources\/[a-zA-Z0-9._/-]{1,450}$/;
const BRANCH_PATTERN = /^[a-zA-Z0-9._/-]{1,250}$/;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9._-]{1,200}$/;

type JulesAction = "list-sources" | "create-session" | "get-session" | "send-message" | "approve-plan";

export async function POST(request: Request) {
  try {
    if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      return jsonError("Content-Type must be application/json.", 415);
    }
    const contentLength = Number(request.headers.get("content-length") || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError("Request is too large.", 413);

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return jsonError("Invalid request body.", 400);
    if (new TextEncoder().encode(JSON.stringify(body)).byteLength > MAX_BODY_BYTES) return jsonError("Request is too large.", 413);

    const input = body as Record<string, unknown>;
    const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
    if (apiKey.length < 8 || apiKey.length > 500) return jsonError("A valid Jules API key is required. Add or re-check it in Settings.", 400);

    const action = input.action;
    if (!isJulesAction(action)) return jsonError("Unsupported Jules action.", 400);
    if (!(await enforceRateLimit(getClientIdentifier(request)))) {
      return jsonError("Too many Jules requests. Please wait a moment and try again.", 429, { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS) });
    }

    if (action === "list-sources") {
      const result = await julesRequest(apiKey, "/sources?pageSize=100");
      return jsonResponse({ sources: Array.isArray(result.sources) ? result.sources : [], nextPageToken: result.nextPageToken });
    }

    if (action === "create-session") {
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      const source = typeof input.source === "string" ? input.source.trim() : "";
      const branch = typeof input.branch === "string" ? input.branch.trim() : "";
      if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return jsonError("Describe a task between 1 and 20,000 characters.", 400);
      if (!SOURCE_PATTERN.test(source) || source.includes("..")) return jsonError("Select a valid Jules repository source.", 400);
      if (!BRANCH_PATTERN.test(branch) || branch.includes("..")) return jsonError("Select a valid repository branch.", 400);
      const title = typeof input.title === "string" ? input.title.trim().slice(0, 120) : prompt.slice(0, 80);
      const session = await julesRequest(apiKey, "/sessions", {
        method: "POST",
        body: JSON.stringify({
          prompt,
          title: title || prompt.slice(0, 80),
          sourceContext: { source, githubRepoContext: { startingBranch: branch } },
          requirePlanApproval: true,
        }),
      });
      return jsonResponse({ session: safeSession(session), activities: [] }, 201);
    }

    const sessionId = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
    if (!SESSION_ID_PATTERN.test(sessionId)) return jsonError("A valid Jules session ID is required.", 400);

    if (action === "get-session") {
      const [session, activitiesResult] = await Promise.all([
        julesRequest(apiKey, `/sessions/${encodeURIComponent(sessionId)}`),
        julesRequest(apiKey, `/sessions/${encodeURIComponent(sessionId)}/activities?pageSize=50`).catch(() => ({ activities: [] })),
      ]);
      return jsonResponse({
        session: safeSession(session),
        activities: Array.isArray(activitiesResult.activities) ? activitiesResult.activities.map(safeActivity) : [],
      });
    }

    if (action === "send-message") {
      const prompt = typeof input.prompt === "string" ? input.prompt.trim() : "";
      if (!prompt || prompt.length > MAX_PROMPT_LENGTH) return jsonError("Enter a message between 1 and 20,000 characters.", 400);
      await julesRequest(apiKey, `/sessions/${encodeURIComponent(sessionId)}:sendMessage`, {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });
      return jsonResponse({ ok: true });
    }

    await julesRequest(apiKey, `/sessions/${encodeURIComponent(sessionId)}:approvePlan`, {
      method: "POST",
      body: "{}",
    });
    return jsonResponse({ ok: true });
  } catch (error) {
    if (error instanceof RateLimitUnavailableError) {
      return jsonError("Security rate limiting is temporarily unavailable. Try again shortly.", 503, { "Retry-After": "30" });
    }
    if (error instanceof JulesApiError) {
      const status = error.status === 401 || error.status === 403 ? 401
        : error.status === 404 ? 404
          : error.status === 429 ? 429
            : error.status >= 500 ? 502 : 400;
      const message = status === 401 ? "Jules rejected the API key or this account lacks access. Check the key and connected repository permissions."
        : status === 404 ? "Jules could not find that repository or session. Refresh the repository list and check the session."
          : status === 429 ? "Jules rate limit or quota reached. Wait a moment and try again."
            : status === 502 ? "Jules is temporarily unavailable. Try again shortly."
              : "Jules rejected the request. Check the selected repository, branch, and task details.";
      return jsonError(message, status, status === 429 ? { "Retry-After": String(RATE_LIMIT_RETRY_AFTER_SECONDS) } : {});
    }
    if (error instanceof Error && (error.message.toLowerCase().includes("json") || error.message.toLowerCase().includes("unexpected end"))) {
      return jsonError("Invalid JSON request body.", 400);
    }
    return jsonError("Could not reach Jules. Check your network connection and try again.", 502);
  }
}

async function julesRequest(apiKey: string, path: string, init: RequestInit = {}): Promise<Record<string, unknown>> {
  const response = await fetch(`${JULES_API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, ...init.headers },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new JulesApiError(response.status);
  if (response.status === 204) return {};
  const body: unknown = await response.json().catch(() => ({}));
  return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

function safeSession(value: Record<string, unknown>) {
  return {
    id: typeof value.id === "string" ? value.id : "",
    name: typeof value.name === "string" ? value.name : "",
    title: typeof value.title === "string" ? value.title : "Jules task",
    prompt: typeof value.prompt === "string" ? value.prompt : "",
    state: typeof value.state === "string" ? value.state : "QUEUED",
    url: typeof value.url === "string" ? value.url : undefined,
    updateTime: typeof value.updateTime === "string" ? value.updateTime : undefined,
    outputs: Array.isArray(value.outputs) ? value.outputs : [],
  };
}

function safeActivity(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const activity = value as Record<string, unknown>;
  const generated = activity.planGenerated as { plan?: { steps?: unknown[] } } | undefined;
  const steps = Array.isArray(generated?.plan?.steps) ? generated.plan.steps.map((value) => {
    const step = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return { title: typeof step.title === "string" ? step.title.slice(0, 300) : "Plan step", description: typeof step.description === "string" ? step.description.slice(0, 1_000) : "" };
  }) : undefined;
  const progress = activity.progressUpdated as { title?: unknown; description?: unknown } | undefined;
  const agentMessage = activity.agentMessaged as { agentMessage?: unknown } | undefined;
  const failed = activity.sessionFailed as { reason?: unknown } | undefined;
  return {
    id: typeof activity.id === "string" ? activity.id : "",
    description: typeof activity.description === "string" ? activity.description.slice(0, 1_000) : "",
    originator: typeof activity.originator === "string" ? activity.originator : "system",
    createTime: typeof activity.createTime === "string" ? activity.createTime : undefined,
    ...(steps ? { planSteps: steps } : {}),
    ...(progress ? { progress: { title: String(progress.title || "Progress"), description: String(progress.description || "") } } : {}),
    ...(agentMessage ? { agentMessage: typeof agentMessage.agentMessage === "string" ? agentMessage.agentMessage.slice(0, 4_000) : "" } : {}),
    ...(failed ? { failureReason: typeof failed.reason === "string" ? failed.reason.slice(0, 1_000) : "Jules reported a failure." } : {}),
  };
}

function isJulesAction(value: unknown): value is JulesAction {
  return value === "list-sources" || value === "create-session" || value === "get-session" || value === "send-message" || value === "approve-plan";
}

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

function jsonError(message: string, status: number, headers: Record<string, string> = {}) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

class JulesApiError extends Error {
  constructor(public readonly status: number) {
    super(`Jules API responded with HTTP ${status}.`);
    this.name = "JulesApiError";
  }
}
