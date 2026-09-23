import { streamText } from "ai";
import { getModelConfig, ModelProvider } from "@/lib/ai-providers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Provider and apiKey are required." },
        { status: 400 }
      );
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required and cannot be empty." },
        { status: 400 }
      );
    }

    // Filter out system messages injected by the UI for model switching
    // because providers like Anthropic expect specific message structures
    // and inline system messages can cause errors.
    const filteredMessages = messages.filter((m: { role: string; content: string }) => m.role !== 'system');

    if (filteredMessages.length === 0) {
       return NextResponse.json(
        { error: "No valid messages found after filtering." },
        { status: 400 }
      );
    }

    const model = getModelConfig(provider as ModelProvider, apiKey);

    const result = streamText({
      model,
      messages: filteredMessages,
    });

    // Use toDataStreamResponse() or toTextStreamResponse depending on ai sdk v7
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyResult = result as any;
    if (typeof anyResult.toDataStreamResponse === "function") {
      return anyResult.toDataStreamResponse();
    }
    return anyResult.toTextStreamResponse();
  } catch (error: unknown) {
    console.error("API Chat Error:", error);

    // Handle standard HTTP errors if we can parse them from the error object
    const err = error as Record<string, unknown>;
    const status = typeof err?.status === "number" ? err.status : 500;
    const message = typeof err?.message === "string" ? err.message : "Internal Server Error";

    if (status === 401 || status === 403) {
      return NextResponse.json({ error: "Invalid API key provided." }, { status: 401 });
    }

    if (status === 429) {
      return NextResponse.json({ error: "Rate limit or quota exceeded. Please try again later." }, { status: 429 });
    }

    // Provider specific error heuristics based on message content
    if (message.toLowerCase().includes("credit") || message.toLowerCase().includes("balance")) {
      return NextResponse.json({ error: "Insufficient credits/balance with the provider." }, { status: 402 });
    }
    if (message.toLowerCase().includes("loading") || message.toLowerCase().includes("queue")) {
      return NextResponse.json({ error: "Model is currently loading or in queue. Please wait and try again." }, { status: 503 });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
