export type AppTheme = "system" | "light" | "dark";

export interface AppSettings {
  defaultProvider: string;
  language: "auto" | "en" | "bn";
  startupBehavior: "welcome" | "last-conversation";
  autoSave: boolean;
  streaming: boolean;
  notifications: boolean;
  compactMode: boolean;
  theme: AppTheme;
}

const STORAGE_KEY = "susan_app_settings_v1";
export const DEFAULT_APP_SETTINGS: AppSettings = {
  defaultProvider: "google",
  language: "auto",
  startupBehavior: "welcome",
  autoSave: true,
  streaming: true,
  notifications: false,
  compactMode: false,
  theme: "light",
};

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_APP_SETTINGS;
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || typeof parsed !== "object") return DEFAULT_APP_SETTINGS;
    const candidate = parsed as Partial<AppSettings>;
    const defaultProvider = ["deepseek", "anthropic", "huggingface", "google", "openai", "qwen", "kimi", "sarvam", "openrouter"].includes(String(candidate.defaultProvider)) ? String(candidate.defaultProvider) : DEFAULT_APP_SETTINGS.defaultProvider;
    const language = candidate.language === "en" || candidate.language === "bn" || candidate.language === "auto" ? candidate.language : DEFAULT_APP_SETTINGS.language;
    const startupBehavior = candidate.startupBehavior === "last-conversation" || candidate.startupBehavior === "welcome" ? candidate.startupBehavior : DEFAULT_APP_SETTINGS.startupBehavior;
    const theme = candidate.theme === "dark" || candidate.theme === "system" || candidate.theme === "light" ? candidate.theme : DEFAULT_APP_SETTINGS.theme;
    return {
      ...DEFAULT_APP_SETTINGS,
      ...candidate,
      defaultProvider,
      language,
      startupBehavior,
      theme,
      autoSave: typeof candidate.autoSave === "boolean" ? candidate.autoSave : DEFAULT_APP_SETTINGS.autoSave,
      streaming: typeof candidate.streaming === "boolean" ? candidate.streaming : DEFAULT_APP_SETTINGS.streaming,
      notifications: typeof candidate.notifications === "boolean" ? candidate.notifications : DEFAULT_APP_SETTINGS.notifications,
      compactMode: typeof candidate.compactMode === "boolean" ? candidate.compactMode : DEFAULT_APP_SETTINGS.compactMode,
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("app-settings-updated"));
}

export function updateAppSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getAppSettings(), ...patch };
  saveAppSettings(next);
  return next;
}

export function resetAppSettings(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("app-settings-updated"));
}
