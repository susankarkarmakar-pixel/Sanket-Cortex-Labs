export type PluginActivityKind = "provider-test" | "tool-run";

export interface PluginActivity {
  id: string;
  kind: PluginActivityKind;
  itemId: string;
  label: string;
  ok: boolean;
  message: string;
  timestamp: string;
}

const TOOL_SETTINGS_KEY = "susan_plugin_tool_settings_v1";
const ACTIVITY_KEY = "susan_plugin_activity_v1";
const MAX_ACTIVITY_ITEMS = 25;

export function isPluginToolEnabled(toolId: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const value = JSON.parse(localStorage.getItem(TOOL_SETTINGS_KEY) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return true;
    return value[toolId] !== false;
  } catch {
    return true;
  }
}

export function setPluginToolEnabled(toolId: string, enabled: boolean): void {
  if (typeof window === "undefined") return;
  const value = readToolSettings();
  value[toolId] = enabled;
  localStorage.setItem(TOOL_SETTINGS_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event("plugin-settings-updated"));
}

export function listPluginActivities(): PluginActivity[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
    if (!Array.isArray(value)) return [];
    return value.filter(isPluginActivity).slice(0, MAX_ACTIVITY_ITEMS);
  } catch {
    return [];
  }
}

export function recordPluginActivity(input: Omit<PluginActivity, "id" | "timestamp">): void {
  if (typeof window === "undefined") return;
  const item: PluginActivity = { ...input, id: crypto.randomUUID(), timestamp: new Date().toISOString() };
  const history = [item, ...listPluginActivities()].slice(0, MAX_ACTIVITY_ITEMS);
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(history));
    window.dispatchEvent(new Event("plugin-activity-updated"));
  } catch {
    // Activity history is best-effort; tool execution must not depend on storage quota.
  }
}

export function clearPluginActivities(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVITY_KEY);
  window.dispatchEvent(new Event("plugin-activity-updated"));
}

function readToolSettings(): Record<string, boolean> {
  try {
    const value = JSON.parse(localStorage.getItem(TOOL_SETTINGS_KEY) || "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, boolean> : {};
  } catch {
    return {};
  }
}

function isPluginActivity(value: unknown): value is PluginActivity {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PluginActivity>;
  return typeof item.id === "string" && (item.kind === "provider-test" || item.kind === "tool-run") && typeof item.itemId === "string" && typeof item.label === "string" && typeof item.ok === "boolean" && typeof item.message === "string" && typeof item.timestamp === "string";
}
