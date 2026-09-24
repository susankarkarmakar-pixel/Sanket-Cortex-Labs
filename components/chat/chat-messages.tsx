"use client";

import { useEffect, useRef } from "react";
import { Brain } from "lucide-react";
import { MessageBubble } from "./message-bubble";

// Use the built-in Message type or structure it explicitly to avoid ai sdk version issues
export type Message = {
  id?: string;
  role: "user" | "assistant" | "system" | "data";
  content: string;
};

interface ChatMessagesProps {
  messages: Message[];
  isStreaming?: boolean;
}

export function ChatMessages({ messages, isStreaming }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or while streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center text-brand-white/30 gap-4 animate-in fade-in duration-500">
          <Brain className="w-16 h-16 opacity-50" />
          <p className="text-lg">Start a conversation with Susan AI</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth"
    >
      <div className="max-w-4xl mx-auto flex flex-col w-full pb-4">
        {messages.map((msg, index) => {
          if (msg.role === "system") {
            return (
              <div key={msg.id || index} className="w-full flex justify-center my-4 animate-in fade-in">
                <div className="bg-brand-gray/30 text-brand-white/50 text-xs px-3 py-1 rounded-full border border-brand-gray/50">
                  {msg.content}
                </div>
              </div>
            );
          }

          return (
            <MessageBubble
              key={msg.id || index}
              role={msg.role as "user" | "assistant"}
              content={msg.content}
              isStreaming={isStreaming && index === messages.length - 1 && msg.role === "assistant"}
            />
          );
        })}
        {isStreaming && messages[messages.length - 1]?.role === "user" && (
          <MessageBubble
            role="assistant"
            content=""
            isStreaming={true}
          />
        )}
      </div>
    </div>
  );
}
