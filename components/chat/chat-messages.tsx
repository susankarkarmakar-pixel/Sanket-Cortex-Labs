"use client";

import { useEffect, useRef } from "react";
import { Brain } from "lucide-react";
import { MessageBubble } from "./message-bubble";

export type Message = {
  role: "user" | "assistant";
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
          <p className="text-lg">Start a conversation with any AI model</p>
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
        {messages.map((msg, index) => (
          <MessageBubble
            key={index}
            role={msg.role}
            content={msg.content}
            isStreaming={isStreaming && index === messages.length - 1 && msg.role === "assistant"}
          />
        ))}
      </div>
    </div>
  );
}
