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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setMessages: (messages: any[]) => void;
  input: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleInputChange: (e: any) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleSubmit: (e: any) => void;
  isLoading: boolean;
  stop: () => void;
  error: Error | undefined;
  conversationTitle: string | null;
}

export function ChatArea({
  onOpenSidebar,
  selectedModel,
  messages,
  setMessages,
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  stop,
  error,
  conversationTitle
}: ChatAreaProps) {
  const [toastError, setToastError] = useState<string | null>(null);

  const modelNames = {
    deepseek: "DeepSeek Chat",
    anthropic: "Claude 3.5 Sonnet",
    huggingface: "Hugging Face (Hermes)",
  };


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
        <div className="flex-1 min-w-0 flex items-center">
          {conversationTitle && (
            <div className="truncate font-medium text-brand-white mr-4 max-w-[200px] md:max-w-[400px]">
              {conversationTitle}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-gray/30 border border-brand-gray/50 font-medium text-xs text-brand-white">
            <span className="mr-0.5">{MODELS_METADATA[selectedModel].icon}</span>
            {MODELS_METADATA[selectedModel].name}
            <div className={`w-1.5 h-1.5 rounded-full ml-1.5 ${MODELS_METADATA[selectedModel].color.replace('text-', 'bg-')}`} />
          </div>
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
