"use client";

import { useEffect, useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, FileUIPart } from "ai";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ModelOption } from "@/components/sidebar/model-selector";
import { SettingsModal } from "@/components/settings/settings-modal";
import { getKeys, ApiKeys } from "@/lib/key-storage";
import { saveConversation, loadConversation, generateConversationId, generateTitle } from "@/lib/chat-storage";
import { Message } from "@/components/chat/chat-messages";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("deepseek");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);
  const [keyVersion, setKeyVersion] = useState(0);
  const [input, setInput] = useState("");

  const transport = useMemo(() => new DefaultChatTransport({
    api: "/api/chat",
    body: () => ({
      provider: selectedModel,
      apiKey: typeof window !== "undefined" ? getKeys()[selectedModel as keyof ApiKeys] || "" : "",
      keyVersion,
    }),
  }), [selectedModel, keyVersion]);

  const useChatProps = useChat({ transport });
  const messages = useMemo(() => useChatProps.messages || [], [useChatProps.messages]);
  const setMessages = useChatProps.setMessages;
  const sendMessage = useChatProps.sendMessage;
  const regenerate = useChatProps.regenerate;
  const isLoading = useChatProps.status === "submitted" || useChatProps.status === "streaming";
  const stop = useChatProps.stop;
  const error = useChatProps.error;
  const displayMessages: Message[] = messages.map((message) => ({
    id: message.id,
    role: message.role === "system" ? "system" : message.role === "assistant" ? "assistant" : "user",
    content: getMessageText(message),
  }));

  useEffect(() => {
    const handleKeysUpdated = () => setKeyVersion((version) => version + 1);
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener("keys-updated", handleKeysUpdated);
    document.addEventListener("open-settings", handleOpenSettings);
    return () => {
      window.removeEventListener("keys-updated", handleKeysUpdated);
      document.removeEventListener("open-settings", handleOpenSettings);
    };
  }, []);

  useEffect(() => {
    if (messages.length === 0 || isLoading) return;
    const timeout = window.setTimeout(() => {
      let idToUse = currentConversationId;
      let titleToUse = conversationTitle;
      if (!idToUse) {
        idToUse = generateConversationId();
        setCurrentConversationId(idToUse);
        const firstUserMessage = messages.find((message) => message.role === "user");
        const firstText = firstUserMessage ? getMessageText(firstUserMessage) : "";
        titleToUse = firstText ? generateTitle(firstText) : "New Conversation";
        setConversationTitle(titleToUse);
      }
      saveConversation(idToUse, titleToUse || "New Conversation", displayMessages, selectedModel);
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [messages, displayMessages, isLoading, currentConversationId, conversationTitle, selectedModel]);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setConversationTitle(null);
    setInput("");
    setMessages([]);
  };

  const handleLoadConversation = (id: string) => {
    const conversation = loadConversation(id);
    if (!conversation) return;
    setCurrentConversationId(conversation.id);
    setConversationTitle(conversation.title);
    setSelectedModel(conversation.model === "manus" ? "deepseek" : conversation.model as ModelOption);
    setInput("");
    const restorableMessages = conversation.messages.filter((message): message is Message & { role: "user" | "assistant" } => message.role === "user" || message.role === "assistant");
    setMessages(restorableMessages.map((message) => ({ id: message.id || generateConversationId(), role: message.role, parts: [{ type: "text" as const, text: message.content }] })));
  };

  const handleSend = async (event: React.FormEvent<HTMLFormElement>, files: File[]) => {
    event.preventDefault();
    const text = input.trim();
    if (!text && files.length === 0) return;
    const fileParts = await Promise.all(files.map(fileToUIPart));
    setInput("");
    await sendMessage({ text, files: fileParts });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-blue">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} selectedModel={selectedModel} onSelectModel={setSelectedModel} onNewChat={handleNewChat} onLoadConversation={handleLoadConversation} currentConversationId={currentConversationId} />
      <ChatArea onOpenSidebar={() => setIsSidebarOpen(true)} selectedModel={selectedModel} messages={displayMessages} input={input} onInputChange={(event) => setInput(event.target.value)} onSend={handleSend} isLoading={isLoading} stop={stop} error={error} onRetry={regenerate} conversationTitle={conversationTitle} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function getMessageText(message: { parts?: Array<{ type?: string; text?: string; filename?: string }>; content?: unknown }): string {
  const text = message.parts?.filter((part) => part.type === "text").map((part) => part.text || "").join("\n") || (typeof message.content === "string" ? message.content : "");
  const files = message.parts?.filter((part) => part.type === "file").map((part) => part.filename || "Attached file") || [];
  return files.length > 0 ? `${text}${text ? "\n\n" : ""}Attachments: ${files.join(", ")}` : text;
}

async function fileToUIPart(file: File): Promise<FileUIPart> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
  return { type: "file", mediaType: file.type || "application/octet-stream", filename: file.name, url };
}
