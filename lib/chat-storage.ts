import { Message } from "@/components/chat/chat-messages";

export interface ConversationSummary {
  id: string;
  title: string;
  date: number;
  model: string;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
}

const STORAGE_KEY = "susan_conversations_v1";
const OLD_STORAGE_KEY = "omnikey_conversations_v1";
const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES = 100;
const MAX_MESSAGE_LENGTH = 100_000;
const MAX_TITLE_LENGTH = 200;
const MAX_IMPORT_BYTES = 10_000_000;
const CURRENT_SCHEMA_VERSION = 1;

export function generateConversationId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 30) return trimmed || "New Conversation";
  return `${trimmed.substring(0, 30)}...`;
}

export function saveConversation(id: string, title: string, messages: Message[], model: string): void {
  if (typeof window === "undefined") return;
  const conversations = getAllConversations();
  const updatedConversation: Conversation = {
    id,
    title: title || "New Conversation",
    messages: messages.filter((message) => message.role !== "data"),
    model,
    date: Date.now(),
  };
  const existingIndex = conversations.findIndex((conversation) => conversation.id === id);
  if (existingIndex >= 0) conversations[existingIndex] = updatedConversation;
  else conversations.unshift(updatedConversation);
  conversations.sort((a, b) => b.date - a.date);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
    window.dispatchEvent(new Event("conversations-updated"));
  } catch (error) {
    console.error("Failed to save conversation", error);
  }
}

export function getConversations(): ConversationSummary[] {
  if (typeof window === "undefined") return [];
  return getAllConversations().map(({ id, title, date, model }) => ({ id, title, date, model }));
}

export function loadConversation(id: string): Conversation | null {
  if (typeof window === "undefined") return null;
  return getAllConversations().find((conversation) => conversation.id === id) || null;
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return;
  writeConversations(getAllConversations().filter((conversation) => conversation.id !== id));
}

export function clearConversations(): void {
  if (typeof window === "undefined") return;
  writeConversations([]);
}

export function exportConversations(): string {
  return JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: new Date().toISOString(), conversations: getAllConversations() }, null, 2);
}

export function importConversations(json: string): { imported: number; skipped: number } {
  if (typeof window === "undefined") return { imported: 0, skipped: 0 };
  if (new TextEncoder().encode(json).byteLength > MAX_IMPORT_BYTES) throw new Error("This conversation export is too large to import safely.");
  const parsed: unknown = JSON.parse(json);
  const input = Array.isArray(parsed) ? parsed : (parsed as { conversations?: unknown })?.conversations;
  if (!Array.isArray(input)) throw new Error("The selected file does not contain a conversation export.");

  const schemaVersion = Array.isArray(parsed) ? 0 : (parsed as { schemaVersion?: unknown; version?: unknown }).schemaVersion ?? (parsed as { version?: unknown }).version;
  if (schemaVersion !== undefined && schemaVersion !== 0 && schemaVersion !== CURRENT_SCHEMA_VERSION) {
    throw new Error(`Unsupported conversation export version: ${String(schemaVersion)}.`);
  }

  const existing = getAllConversations();
  let imported = 0;
  let skipped = 0;
  for (const item of input) {
    if (!isConversation(item)) {
      skipped += 1;
      continue;
    }
    const conversation = { ...item, id: existing.some((entry) => entry.id === item.id) ? generateConversationId() : item.id };
    existing.push(conversation);
    imported += 1;
  }
  existing.sort((a, b) => b.date - a.date);
  writeConversations(existing.slice(0, MAX_CONVERSATIONS));
  return { imported, skipped: skipped + Math.max(0, existing.length - MAX_CONVERSATIONS) };
}

function writeConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations.slice(0, MAX_CONVERSATIONS)));
    window.dispatchEvent(new Event("conversations-updated"));
  } catch (error) {
    console.error("Failed to update conversations", error);
    throw new Error("There is not enough browser storage to save this change.");
  }
}

function getAllConversations(): Conversation[] {
  try {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      stored = localStorage.getItem(OLD_STORAGE_KEY);
      if (stored) {
        localStorage.setItem(STORAGE_KEY, stored);
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
    }
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isConversation) : [];
  } catch (error) {
    console.error("Failed to parse stored conversations", error);
    return [];
  }
}

function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Conversation>;
  return Boolean(
    typeof candidate.id === "string" && candidate.id.length > 0 && candidate.id.length <= 200 &&
    typeof candidate.title === "string" && candidate.title.length <= MAX_TITLE_LENGTH &&
    typeof candidate.date === "number" && Number.isFinite(candidate.date) && candidate.date > 0 &&
    typeof candidate.model === "string" && candidate.model.length > 0 && candidate.model.length <= 100 &&
    Array.isArray(candidate.messages) && candidate.messages.length <= MAX_MESSAGES &&
    candidate.messages.every(isMessage)
  );
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<Message>;
  return Boolean(
    (candidate.role === "user" || candidate.role === "assistant" || candidate.role === "system" || candidate.role === "data") &&
    typeof candidate.content === "string" && candidate.content.length <= MAX_MESSAGE_LENGTH
  );
}
