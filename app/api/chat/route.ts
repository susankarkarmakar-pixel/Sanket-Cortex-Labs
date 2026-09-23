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

    const model = getModelConfig(provider as ModelProvider, apiKey);

    const result = streamText({
      model,
      messages,
    });

    // Use toDataStreamResponse() for ai sdk v7 if it exists, otherwise toTextStreamResponse or toDataStreamResponse equivalent
    return "toDataStreamResponse" in result
      ? (result.toDataStreamResponse as () => Response)()
      : (result.toTextStreamResponse as () => Response)();
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
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }

    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
