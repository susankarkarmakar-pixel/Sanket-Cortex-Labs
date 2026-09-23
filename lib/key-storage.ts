// Note: This uses simple base64 encoding for basic obfuscation.
// In a true production environment, you should use proper AES-256 encryption.

export interface ApiKeys {
  deepseek?: string;
  anthropic?: string;
  huggingface?: string;
}

const STORAGE_KEY = "omnikey_api_keys_v1";

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
}

export function getKeys(): ApiKeys {
  if (typeof window === "undefined") return {};

  const stored = localStorage.getItem(STORAGE_KEY);
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
}
