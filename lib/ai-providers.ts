import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";

export type ModelProvider = "deepseek" | "anthropic" | "huggingface" | "google" | "openai" | "qwen" | "kimi" | "manus";

export const PROVIDER_DISPLAY_NAMES: Record<ModelProvider, string> = {
  deepseek: "DeepSeek Chat",
  anthropic: "Claude 3.5 Sonnet",
  huggingface: "Hugging Face (Hermes)",
  google: "Google Gemini 1.5 Pro",
  openai: "OpenAI GPT-4o",
  qwen: "Qwen Max",
  kimi: "Kimi (Moonshot)",
  manus: "Manus",
};

export const MODELS_METADATA: Record<ModelProvider, { name: string; description: string; color: string; icon: string }> = {
  deepseek: {
    name: "DeepSeek Chat",
    description: "Fast and efficient reasoning model",
    color: "text-blue-400",
    icon: "🧠",
  },
  anthropic: {
    name: "Claude 3.5 Sonnet",
    description: "Advanced reasoning by Anthropic",
    color: "text-orange-400",
    icon: "✨",
  },
  huggingface: {
    name: "Hugging Face (Hermes)",
    description: "Open-source Hermes model",
    color: "text-yellow-400",
    icon: "🤗",
  },
  google: {
    name: "Google Gemini 1.5 Pro",
    description: "Multimodal model by Google",
    color: "text-blue-500",
    icon: "G",
  },
  openai: {
    name: "OpenAI GPT-4o",
    description: "Advanced model by OpenAI",
    color: "text-emerald-500",
    icon: "O",
  },
  qwen: {
    name: "Qwen Max",
    description: "Large language model by Alibaba Cloud",
    color: "text-purple-400",
    icon: "Q",
  },
  kimi: {
    name: "Kimi (Moonshot)",
    description: "Long-context model by Moonshot AI",
    color: "text-red-400",
    icon: "K",
  },
  manus: {
    name: "Manus",
    description: "Manus AI Model",
    color: "text-indigo-400",
    icon: "M",
  },
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
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: apiKey,
      });
      return google("gemini-1.5-pro-latest");
    }
    case "openai": {
      const openai = createOpenAI({
        apiKey: apiKey,
      });
      return openai("gpt-4o");
    }
    case "qwen": {
      const qwen = createOpenAI({
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: apiKey,
      });
      return qwen("qwen-max");
    }
    case "kimi": {
      const kimi = createOpenAI({
        baseURL: "https://api.moonshot.cn/v1",
        apiKey: apiKey,
      });
      return kimi("moonshot-v1-8k");
    }
    case "manus": {
      const manus = createOpenAI({
        baseURL: "https://api.manus.ai/v1", // Adjust if actual endpoint is different
        apiKey: apiKey,
      });
      return manus("manus-model"); // Adjust if actual model name is different
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
