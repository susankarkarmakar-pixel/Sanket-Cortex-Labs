import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { LanguageModel } from "ai";

export type ModelProvider = "deepseek" | "anthropic" | "huggingface" | "google" | "openai" | "qwen" | "kimi" | "manus" | "sarvam" | "openrouter";

export interface ProviderMetadata {
  name: string;
  description: string;
  color: string;
  icon: string;
  model: string;
  tier: "free-tier" | "paid-or-trial" | "async";
  setupUrl: string;
}

export const PROVIDER_DISPLAY_NAMES: Record<ModelProvider, string> = {
  deepseek: "DeepSeek Chat",
  anthropic: "Claude Sonnet",
  huggingface: "Hugging Face",
  google: "Google Gemini Flash-Lite",
  openai: "OpenAI GPT",
  qwen: "Qwen Max",
  kimi: "Kimi",
  manus: "Manus (async tasks)",
  sarvam: "Sarvam 105B",
  openrouter: "OpenRouter Free Router",
};

export const MODELS_METADATA: Record<ModelProvider, ProviderMetadata> = {
  deepseek: { name: "DeepSeek Chat", description: "Fast reasoning model", color: "text-blue-400", icon: "🧠", model: "deepseek-chat", tier: "paid-or-trial", setupUrl: "https://platform.deepseek.com/api_keys" },
  anthropic: { name: "Claude Sonnet", description: "Advanced reasoning by Anthropic", color: "text-orange-400", icon: "✨", model: "claude-3-5-sonnet-20241022", tier: "paid-or-trial", setupUrl: "https://console.anthropic.com/settings/keys" },
  huggingface: { name: "Hugging Face", description: "Open models; quota varies", color: "text-yellow-400", icon: "🤗", model: "NousResearch/Hermes-3-Llama-3.1-8B", tier: "free-tier", setupUrl: "https://huggingface.co/settings/tokens" },
  google: { name: "Google Gemini Flash-Lite", description: "Google AI Studio free-tier eligible", color: "text-blue-500", icon: "G", model: "gemini-3.5-flash-lite", tier: "free-tier", setupUrl: "https://aistudio.google.com/apikey" },
  openai: { name: "OpenAI GPT", description: "OpenAI API", color: "text-emerald-500", icon: "O", model: "gpt-4o-mini", tier: "paid-or-trial", setupUrl: "https://platform.openai.com/api-keys" },
  qwen: { name: "Qwen Max", description: "Alibaba Cloud model", color: "text-purple-400", icon: "Q", model: "qwen-max", tier: "paid-or-trial", setupUrl: "https://bailian.console.aliyun.com/" },
  kimi: { name: "Kimi", description: "Long-context Moonshot model", color: "text-red-400", icon: "K", model: "moonshot-v1-8k", tier: "paid-or-trial", setupUrl: "https://platform.moonshot.cn/console/api-keys" },
  manus: { name: "Manus", description: "Async agent tasks; not instant chat", color: "text-indigo-400", icon: "M", model: "manus-1.6", tier: "async", setupUrl: "https://manus.im/app/developers" },
  sarvam: { name: "Sarvam 105B", description: "Indian-language chat model", color: "text-teal-400", icon: "S", model: "sarvam-105b-conversations", tier: "paid-or-trial", setupUrl: "https://dashboard.sarvam.ai/" },
  openrouter: { name: "OpenRouter Free Router", description: "Automatically routes to available free models", color: "text-violet-500", icon: "R", model: "openrouter/free", tier: "free-tier", setupUrl: "https://openrouter.ai/settings/keys" },
};

export function getModelConfig(provider: ModelProvider, apiKey: string): LanguageModel {
  switch (provider) {
    case "deepseek": return createOpenAI({ baseURL: "https://api.deepseek.com/v1", apiKey })("deepseek-chat");
    case "anthropic": return createAnthropic({ apiKey })("claude-3-5-sonnet-20241022");
    case "huggingface": return createOpenAI({ baseURL: "https://api-inference.huggingface.co/v1", apiKey })("NousResearch/Hermes-3-Llama-3.1-8B");
    case "google": return createGoogleGenerativeAI({ apiKey })("gemini-3.5-flash-lite");
    case "openai": return createOpenAI({ apiKey })("gpt-4o-mini");
    case "qwen": return createOpenAI({ baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", apiKey })("qwen-max");
    case "kimi": return createOpenAI({ baseURL: "https://api.moonshot.cn/v1", apiKey })("moonshot-v1-8k");
    case "sarvam": return createOpenAI({ baseURL: "https://api.sarvam.ai/v1", apiKey, headers: { "api-subscription-key": apiKey } })("sarvam-105b-conversations");
    case "openrouter": return createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, headers: { "HTTP-Referer": "https://susan-ai.app", "X-Title": "Susan AI" } })("openrouter/free");
    case "manus": throw new Error("Manus API is asynchronous and cannot be used as an instant chat provider yet. Select Google, OpenRouter, or Sarvam for chat.");
    default: throw new Error(`Unsupported provider: ${provider}`);
  }
}

export const FREE_TIER_DIRECTORY: Array<{ provider: ModelProvider; title: string; model: string; note: string }> = [
  { provider: "google", title: "Google AI Studio", model: "Gemini 3.5 Flash-Lite", note: "Free-tier availability and quotas depend on region and account." },
  { provider: "openrouter", title: "OpenRouter Free Router", model: "openrouter/free", note: "Routes to currently available free models; availability can change." },
  { provider: "huggingface", title: "Hugging Face Inference", model: "Open models", note: "Free credits or access depend on the account and selected model." },
];
