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

export function generateConversationId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function generateTitle(firstMessage: string): string {
  const trimmed = firstMessage.trim();
  if (trimmed.length <= 30) return trimmed;
  return trimmed.substring(0, 30) + "...";
}

export function saveConversation(id: string, title: string, messages: Message[], model: string): void {
  if (typeof window === "undefined") return;

  const conversations = getAllConversations();

  const existingIndex = conversations.findIndex(c => c.id === id);
  const updatedConversation: Conversation = {
    id,
    title,
    messages,
    model,
    date: Date.now(),
  };

  if (existingIndex >= 0) {
    // Update existing
    conversations[existingIndex] = updatedConversation;
  } else {
    // Add new
    conversations.unshift(updatedConversation);
  }

  // Sort by date descending
  conversations.sort((a, b) => b.date - a.date);

  // Enforce max limit
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations.length = MAX_CONVERSATIONS;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));

  // Dispatch event so UI can update
  window.dispatchEvent(new Event('conversations-updated'));
}

export function getConversations(): ConversationSummary[] {
  if (typeof window === "undefined") return [];
  const conversations = getAllConversations();

  // Return without messages to save memory when just listing
  return conversations.map(({ id, title, date, model }) => ({ id, title, date, model }));
}

export function loadConversation(id: string): Conversation | null {
  if (typeof window === "undefined") return null;
  const conversations = getAllConversations();
  return conversations.find(c => c.id === id) || null;
}

export function deleteConversation(id: string): void {
  if (typeof window === "undefined") return;
  const conversations = getAllConversations();
  const filtered = conversations.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  // Dispatch event so UI can update
  window.dispatchEvent(new Event('conversations-updated'));
}

// Internal helper
function getAllConversations(): Conversation[] {
  try {
    let stored = localStorage.getItem(STORAGE_KEY);

    // Migration logic for backward compatibility
    if (!stored) {
      stored = localStorage.getItem(OLD_STORAGE_KEY);
      if (stored) {
        // Migrate to the new key and optionally remove the old one
        localStorage.setItem(STORAGE_KEY, stored);
        localStorage.removeItem(OLD_STORAGE_KEY);
      }
    }

    if (!stored) return [];
    return JSON.parse(stored) as Conversation[];
  } catch (e) {
    console.error("Failed to parse stored conversations", e);
    return [];
  }
}
