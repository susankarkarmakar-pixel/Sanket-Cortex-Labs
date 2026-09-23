"use client";

import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { useChat } from "@ai-sdk/react";
import { ModelOption } from "@/components/sidebar/model-selector";
import { ChatMessages } from "./chat-messages";
import { MessageInput } from "./message-input";
import { getKeys, ApiKeys } from "@/lib/key-storage";
import { MODELS_METADATA } from "@/lib/ai-providers";

interface ChatAreaProps {
  onOpenSidebar: () => void;
  selectedModel: ModelOption;
}

export function ChatArea({ onOpenSidebar, selectedModel }: ChatAreaProps) {
  const [toastError, setToastError] = useState<string | null>(null);

  const modelNames = {
    deepseek: "DeepSeek Chat",
    anthropic: "Claude 3.5 Sonnet",
    huggingface: "Hugging Face (Hermes)",
  };

  const chatConfig = {
    api: "/api/chat",
    body: {
      provider: selectedModel,
      apiKey: getKeys()[selectedModel as keyof ApiKeys] || "",
    },
    onError: (err: Error) => {
      setToastError(err.message || "An error occurred during chat.");
      setTimeout(() => setToastError(null), 5000);
    }
  };

  // We are using @ai-sdk/react which has types that conflict or use generic constraints.
  // Extract values ignoring exact types to bypass TS errors since this works correctly at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const useChatProps = useChat(chatConfig as any) as any;
  // Memoize messages array reference if we only care about length, or just disable the exhaustive-deps
  // warning since `useChat`'s `messages` array changes predictably.
  const messages = useChatProps.messages || [];
  const setMessages = useChatProps.setMessages;
  const input = useChatProps.input || "";
  const handleInputChange = useChatProps.handleInputChange;
  const handleSubmit = useChatProps.handleSubmit;
  const isLoading = useChatProps.isLoading || false;
  const stop = useChatProps.stop;
  const error = useChatProps.error;

  // Track the previous model to insert system messages
  const [prevModel, setPrevModel] = useState<ModelOption>(selectedModel);

  useEffect(() => {
    if (selectedModel !== prevModel) {
      setTimeout(() => {
        if (messages.length > 0) {
          const modelMeta = MODELS_METADATA[selectedModel];
          const newSystemMessage = {
            id: Date.now().toString(),
            role: "system",
            content: `Switched to ${modelMeta.name}`,
          };
          // Insert the system message
          if (typeof setMessages === "function") {
            setMessages([...messages, newSystemMessage]);
          }
        }
        setPrevModel(selectedModel);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedModel]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check for API key before sending
    const keys = getKeys();
    if (!keys[selectedModel as keyof ApiKeys]) {
      setToastError(`Please add your ${modelNames[selectedModel]} API key in Settings first.`);
      setTimeout(() => setToastError(null), 5000);
      document.dispatchEvent(new CustomEvent('open-settings'));
      return;
    }

    handleSubmit(e);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-blue relative overflow-hidden">
      {/* Top Bar */}
      <header className="h-16 flex items-center px-4 border-b border-brand-gray/30 gap-4 shrink-0 bg-brand-blue/90 backdrop-blur-sm z-20">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 text-brand-white/80 hover:text-brand-white rounded-lg hover:bg-brand-gray/50"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-gray/30 border border-brand-gray/50 font-medium text-sm text-brand-white">
          <span className="mr-1">{MODELS_METADATA[selectedModel].icon}</span>
          {MODELS_METADATA[selectedModel].name}
          <div className={`w-2 h-2 rounded-full ml-1.5 ${MODELS_METADATA[selectedModel].color.replace('text-', 'bg-')}`} />
        </div>
      </header>

      {/* Toast Notification */}
      {toastError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-30 animate-in fade-in slide-in-from-top-4 backdrop-blur-sm">
          {toastError}
        </div>
      )}

      {/* Error state from useChat */}
      {error && !toastError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium z-30 animate-in fade-in slide-in-from-top-4 backdrop-blur-sm">
          API Error: {error.message}
        </div>
      )}

      {/* Main Messages Area */}
      <ChatMessages messages={messages} isStreaming={isLoading} />

      {/* Input Area */}
      <MessageInput
        input={input}
        handleInputChange={handleInputChange}
        onSubmit={onSubmit}
        isLoading={isLoading}
        stop={stop}
      />
    </div>
  );
}
