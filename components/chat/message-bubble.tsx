import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
}

export function MessageBubble({ role, content, isStreaming }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-3 flex items-start gap-3 relative group",
          isUser
            ? "bg-brand-purple text-brand-white rounded-br-sm"
            : "bg-brand-gray text-brand-white/90 rounded-bl-sm border border-brand-gray/50 shadow-sm"
        )}
      >
        {!isUser && (
          <div className="shrink-0 text-xl leading-none select-none mt-0.5">
            🧠
          </div>
        )}

        <div className="flex-1 whitespace-pre-wrap break-words leading-relaxed">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-brand-white/80 animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  );
}
