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
    <div className="p-4 bg-brand-blue/50 backdrop-blur-md border-t border-brand-gray/30 w-full relative z-10">
      <form
        ref={formRef}
        onSubmit={onSubmit}
        className="max-w-4xl mx-auto relative flex items-end gap-2 bg-brand-gray/30 border border-brand-gray/50 rounded-xl p-2 focus-within:ring-1 focus-within:ring-brand-cyan/50 focus-within:border-brand-cyan/50 transition-all shadow-lg"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type your message... (Shift+Enter for new line)"
          className="flex-1 bg-transparent resize-none outline-none text-brand-white placeholder:text-brand-white/40 px-2 py-2.5 max-h-[120px] min-h-[44px] overflow-y-auto"
          rows={1}
        />

        {isLoading ? (
          <button
            type="button"
            onClick={stop}
            className="p-2.5 rounded-lg transition-colors mb-0.5 shrink-0 flex items-center justify-center bg-brand-gray/80 text-brand-white hover:bg-brand-gray shadow-sm"
          >
            <Square className="w-5 h-5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={isEmpty}
            className={cn(
              "p-2.5 rounded-lg transition-colors mb-0.5 shrink-0 flex items-center justify-center",
              isEmpty
                ? "bg-brand-gray/50 text-brand-white/30 cursor-not-allowed"
                : "bg-brand-cyan text-brand-blue hover:bg-brand-cyan/90 shadow-sm"
            )}
          >
            <ArrowUp className="w-5 h-5" />
          </button>
        )}
      </form>
      <div className="text-center mt-2 text-xs text-brand-white/30">
        Susan AI may produce inaccurate information about people, places, or facts.
      </div>
    </div>
  );
}
