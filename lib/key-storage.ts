// Note: This uses simple base64 encoding for basic obfuscation.
// In a true production environment, you should use proper AES-256 encryption.

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
}

const STORAGE_KEY = "susan_api_keys_v1";
const OLD_STORAGE_KEY = "omnikey_api_keys_v1";

export function saveKeys(keys: ApiKeys): void {
  if (typeof window === "undefined") return;

  const currentKeys = getKeys();
  const updatedKeys = { ...currentKeys, ...keys };

  // Remove empty keys to avoid storing empty strings
  const cleanedKeys: ApiKeys = {};
  (Object.keys(updatedKeys) as Array<keyof ApiKeys>).forEach((key) => {
    if (updatedKeys[key]) {
      cleanedKeys[key] = updatedKeys[key];
    }
  });

  const jsonString = JSON.stringify(cleanedKeys);
  const base64Encoded = btoa(jsonString);
  localStorage.setItem(STORAGE_KEY, base64Encoded);

  // Dispatch custom event for UI updates
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event('keys-updated'));
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
    const jsonString = atob(stored);
    return JSON.parse(jsonString) as ApiKeys;
  } catch (e) {
    console.error("Failed to decode stored API keys", e);
    return {};
  }
}

export function hasKey(provider: keyof ApiKeys): boolean {
  const keys = getKeys();
  return !!keys[provider];
}

export function clearKeys(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event('keys-updated'));
  }
}
