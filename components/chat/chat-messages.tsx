"use client";

import { useEffect, useRef } from "react";
import { Code2, FileText, Lightbulb, PenLine, Sparkles } from "lucide-react";
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
  onRetry?: () => void;
  onPrompt?: (prompt: string) => void;
}

export function ChatMessages({ messages, isStreaming, onRetry, onPrompt }: ChatMessagesProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive or while streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center py-8 md:py-14 animate-in fade-in duration-500">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-cream-highlight text-accent shadow-sm">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-center font-serif text-3xl font-semibold tracking-tight text-text-main md:text-4xl">Welcome to Susan AI</h1>
          <p className="mt-3 max-w-xl text-center text-sm text-text-muted md:text-base">Your personal AI assistant for learning, creating, and exploring ideas.</p>
          <div className="mt-10 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              [PenLine, "Help me write", "Create content, emails, blogs and more", "Help me write a polished email about"],
              [Lightbulb, "Explain concepts", "Learn new topics in simple terms", "Explain this concept in simple terms:"],
              [Code2, "Help with coding", "Debug, review code and best practices", "Help me understand and improve this code:"],
              [FileText, "Summarize content", "Get key insights from articles, PDFs and more", "Summarize the following content:"],
            ].map(([Icon, title, description, prompt]) => {
              const PromptIcon = Icon as typeof PenLine;
              return (
                <button key={title as string} type="button" onClick={() => onPrompt?.(prompt as string)} className="group rounded-2xl border border-border-main/70 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-md">
                  <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-xl bg-cream-highlight text-accent"><PromptIcon className="h-5 w-5" /></span>
                  <span className="block text-sm font-semibold text-text-main">{title as string}</span>
                  <span className="mt-1 block text-xs leading-5 text-text-muted">{description as string}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth"
    >
      <div className="max-w-3xl mx-auto flex flex-col w-full pb-4">
        {messages.map((msg, index) => {
          if (msg.role === "system") {
            return (
              <div key={msg.id || index} className="w-full flex justify-center my-6 animate-in fade-in">
                <div className="bg-black/5 text-text-muted text-xs px-4 py-1.5 rounded-full font-medium">
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
              onRetry={onRetry && msg.role === "assistant" && index === messages.length - 1 ? onRetry : undefined}
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
