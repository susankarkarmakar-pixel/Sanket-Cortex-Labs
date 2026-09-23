"use client";

import { useState, useEffect, useRef } from "react";
import { useChat } from "@ai-sdk/react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ModelOption } from "@/components/sidebar/model-selector";
import { SettingsModal } from "@/components/settings/settings-modal";
import { getKeys, ApiKeys } from "@/lib/key-storage";
import {
  saveConversation,
  loadConversation,
  generateConversationId,
  generateTitle
} from "@/lib/chat-storage";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("deepseek");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState<string | null>(null);

  // Setup useChat centrally to manage history
  const chatConfig = {
    api: "/api/chat",
    body: {
      provider: selectedModel,
      apiKey: typeof window !== "undefined" ? getKeys()[selectedModel as keyof ApiKeys] || "" : "",
    },
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useChatProps = useChat(chatConfig as any) as any;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const messages = useChatProps.messages || [];
  const setMessages = useChatProps.setMessages;
  const input = useChatProps.input || "";
  const handleInputChange = useChatProps.handleInputChange;
  const handleSubmit = useChatProps.handleSubmit;
  const isLoading = useChatProps.isLoading || false;
  const stop = useChatProps.stop;
  const error = useChatProps.error;

  // Auto-save logic
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      setTimeout(() => {
        let idToUse = currentConversationId;
        let titleToUse = conversationTitle;

        if (!idToUse) {
          idToUse = generateConversationId();
          setCurrentConversationId(idToUse);

          // Generate title from first user message if available
          const firstUserMsg = messages.find((m: { role: string; content: string }) => m.role === 'user');
          if (firstUserMsg && !titleToUse) {
            titleToUse = generateTitle(firstUserMsg.content);
            setConversationTitle(titleToUse);
          } else {
            titleToUse = "New Conversation";
            setConversationTitle(titleToUse);
          }
        }

        saveConversation(idToUse, titleToUse || "New Conversation", messages, selectedModel);
      }, 0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, isLoading, currentConversationId, conversationTitle, selectedModel]);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    document.addEventListener("open-settings", handleOpenSettings);
    return () => document.removeEventListener("open-settings", handleOpenSettings);
  }, []);

  const handleNewChat = () => {
    setCurrentConversationId(null);
    setConversationTitle(null);
    if (typeof setMessages === "function") {
      setMessages([]);
    }
  };

  const handleLoadConversation = (id: string) => {
    const conv = loadConversation(id);
    if (conv) {
      setCurrentConversationId(conv.id);
      setConversationTitle(conv.title);
      setSelectedModel(conv.model as ModelOption);
      if (typeof setMessages === "function") {
        setMessages(conv.messages);
      }
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-brand-blue">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
        onNewChat={handleNewChat}
        onLoadConversation={handleLoadConversation}
        currentConversationId={currentConversationId}
      />
      <ChatArea
        onOpenSidebar={() => setIsSidebarOpen(true)}
        selectedModel={selectedModel}
        messages={messages}
        setMessages={setMessages}
        input={input}
        handleInputChange={handleInputChange}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        stop={stop}
        error={error}
        conversationTitle={conversationTitle}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
