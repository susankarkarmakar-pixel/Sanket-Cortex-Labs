"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { ModelOption } from "@/components/sidebar/model-selector";
import { ChatMessages, Message } from "./chat-messages";
import { MessageInput } from "./message-input";

interface ChatAreaProps {
  onOpenSidebar: () => void;
  selectedModel: ModelOption;
}

export function ChatArea({ onOpenSidebar, selectedModel }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);

  const modelNames = {
    deepseek: "DeepSeek Chat",
    claude: "Claude 3.5 Sonnet",
    huggingface: "Hugging Face (Hermes)",
  };

  const handleSend = (content: string) => {
    // 1. Add user message
    const userMessage: Message = { role: "user", content };
    setMessages((prev) => [...prev, userMessage]);
    setIsStreaming(true);

    // 2. Add empty assistant message placeholder
    const assistantMessage: Message = { role: "assistant", content: "" };
    setMessages((prev) => [...prev, assistantMessage]);

    // 3. Mock API response after 1 second
    setTimeout(() => {
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;

        if (newMessages[lastIndex].role === "assistant") {
          newMessages[lastIndex] = {
            role: "assistant",
            content: `This is a mock response from ${modelNames[selectedModel]}.\n\nReal API integration will be implemented in Phase 5!`,
          };
        }
        return newMessages;
      });
      setIsStreaming(false);
    }, 1000);
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
        <div className="font-medium text-brand-white">
          {modelNames[selectedModel]}
        </div>
      </header>

      {/* Main Messages Area */}
      <ChatMessages messages={messages} isStreaming={isStreaming} />

      {/* Input Area */}
      <MessageInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
