import { ApiKeys } from "@/lib/key-storage";

export interface CustomProvider {
  id: string;
  name: string;
  model: string;
  baseUrl: string;
  createdAt: string;
}

const STORAGE_KEY = "susan_custom_providers_v1";

export function getCustomProviders(): CustomProvider[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as CustomProvider[];
    return Array.isArray(value) ? value.filter(isCustomProvider) : [];
  } catch {
    return [];
  }
}

export function saveCustomProviders(providers: CustomProvider[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
  window.dispatchEvent(new Event("custom-providers-updated"));
}

export function addCustomProvider(input: Omit<CustomProvider, "id" | "createdAt">): CustomProvider {
  const provider: CustomProvider = { ...input, id: `custom_${crypto.randomUUID()}`, createdAt: new Date().toISOString() };
  saveCustomProviders([...getCustomProviders(), provider]);
  return provider;
}

export function removeCustomProvider(id: string, keys?: ApiKeys): void {
  saveCustomProviders(getCustomProviders().filter((provider) => provider.id !== id));
  if (keys && keys[id]) {
    const nextKeys = { ...keys };
    delete nextKeys[id];
    const encoded = btoa(JSON.stringify(nextKeys));
    localStorage.setItem("susan_api_keys_v1", encoded);
    window.dispatchEvent(new Event("keys-updated"));
  }
}

export function isCustomProvider(value: unknown): value is CustomProvider {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<CustomProvider>;
  return typeof item.id === "string" && item.id.startsWith("custom_") && typeof item.name === "string" && typeof item.model === "string" && typeof item.baseUrl === "string" && isAllowedBaseUrl(item.baseUrl);
}

export function isAllowedBaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return true;
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
}
