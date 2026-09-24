"use client";

import { useRef, useEffect } from "react";
import { ArrowUp, Square } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageInputProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  isLoading: boolean;
  stop: () => void;
}

export function MessageInput({
  input,
  handleInputChange,
  onSubmit,
  isLoading,
  stop
}: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isLoading && formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  };

  const isEmpty = input.trim().length === 0;

  return (
    <div className="p-4 bg-bg-main w-full relative z-10">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto relative flex items-end gap-2 bg-surface rounded-2xl p-2 shadow-sm border border-border-main/50 focus-within:border-border-main focus-within:ring-1 focus-within:ring-border-main/50 transition-all"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          className="flex-1 bg-transparent resize-none outline-none text-text-main placeholder:text-text-muted/60 px-3 py-3 max-h-[200px] min-h-[48px] overflow-y-auto font-sans"
          rows={1}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="p-2.5 rounded-xl transition-colors mb-1 shrink-0 flex items-center justify-center bg-text-main text-surface hover:opacity-80"
          >
            <Square className="w-4 h-4 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isEmpty}
            className={cn(
              "p-2.5 rounded-xl transition-colors mb-1 shrink-0 flex items-center justify-center",
              isEmpty
                ? "bg-black/5 text-text-muted/40 cursor-not-allowed"
                : "bg-accent text-white hover:opacity-90 shadow-sm"
            )}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        )}
      </form>
      <div className="text-center mt-3 text-xs text-text-muted/70">
        Susan AI may produce inaccurate information about people, places, or facts.
      </div>
    </div>
  );
}
