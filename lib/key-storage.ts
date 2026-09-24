export interface ApiKeys {
  deepseek?: string;
  anthropic?: string;
  huggingface?: string;
  google?: string;
  openai?: string;
  qwen?: string;
  kimi?: string;
  manus?: string;
  sarvam?: string;
  openrouter?: string;
}

const STORAGE_KEY = "susan_api_keys_v1";
const OLD_STORAGE_KEY = "omnikey_api_keys_v1";

export function saveKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;
  const cleanedKeys: ApiKeys = {};
  for (const key of Object.keys(keys) as Array<keyof ApiKeys>) {
    const value = keys[key]?.trim();
    if (value) cleanedKeys[key] = value;
  }
  try {
    localStorage.setItem(STORAGE_KEY, btoa(JSON.stringify(cleanedKeys)));
    window.dispatchEvent(new Event("keys-updated"));
  } catch (error) {
    console.error("Failed to save API keys", error);
  }
}

export function getKeys(): ApiKeys {
  if (typeof window === "undefined") return {};
  let stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    stored = localStorage.getItem(OLD_STORAGE_KEY);
    if (stored) {
      localStorage.setItem(STORAGE_KEY, stored);
      localStorage.removeItem(OLD_STORAGE_KEY);
    }
  }
  if (!stored) return {};
  try {
    const parsed = JSON.parse(atob(stored)) as ApiKeys;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    console.error("Failed to decode stored API keys", error);
    return {};
  }
}

export function hasKey(provider: keyof ApiKeys): boolean {
  return Boolean(getKeys()[provider]);
}

export function clearKeys(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(OLD_STORAGE_KEY);
  window.dispatchEvent(new Event("keys-updated"));
}
