import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { LanguageModel } from "ai";

export type ModelProvider = "deepseek" | "anthropic" | "huggingface";

export const PROVIDER_DISPLAY_NAMES: Record<ModelProvider, string> = {
  deepseek: "DeepSeek Chat",
  anthropic: "Claude 3.5 Sonnet",
  huggingface: "Hugging Face (Hermes)",
};

export function getModelConfig(
  provider: ModelProvider,
  apiKey: string
): LanguageModel {
  switch (provider) {
    case "deepseek": {
      const deepseek = createOpenAI({
        baseURL: "https://api.deepseek.com/v1",
        apiKey: apiKey,
      });
      return deepseek("deepseek-chat");
    }
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: apiKey,
      });
      return anthropic("claude-3-5-sonnet-20241022");
    }
    case "huggingface": {
      const huggingface = createOpenAI({
        baseURL: "https://api-inference.huggingface.co/models/NousResearch/Hermes-3-Llama-3.1-8B/v1",
        apiKey: apiKey,
      });
      // Hugging Face inference API uses the model name in the path,
      // but OpenAI sdk requires a model name argument.
      // We pass the model ID or a generic name.
      return huggingface("NousResearch/Hermes-3-Llama-3.1-8B");
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
