"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
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
  input: string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSend: (event: React.FormEvent<HTMLFormElement>, files: File[]) => void | Promise<void>;
  isLoading: boolean;
  stop: () => void;
  error: Error | undefined;
  onRetry: () => void;
  conversationTitle: string | null;
}

export function ChatArea({ onOpenSidebar, selectedModel, messages, input, onInputChange, onSend, isLoading, stop, error, onRetry, conversationTitle }: ChatAreaProps) {
  const [toastError, setToastError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>, files: File[]) => {
    const keys = getKeys();
    if (!keys[selectedModel as keyof ApiKeys]) {
      event.preventDefault();
      setToastError(`Please add your ${MODELS_METADATA[selectedModel].name} API key in Settings first.`);
      window.setTimeout(() => setToastError(null), 5000);
      document.dispatchEvent(new CustomEvent("open-settings"));
      return;
    }
    void onSend(event, files);
  };

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-bg-main">
      <header className="z-20 flex h-14 shrink-0 items-center gap-4 bg-bg-main/90 px-4 backdrop-blur-sm">
        <button type="button" onClick={onOpenSidebar} aria-label="Open sidebar" className="-ml-2 rounded-lg p-2 text-text-muted hover:bg-black/5 hover:text-text-main lg:hidden">
          <Menu className="h-6 w-6" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center">
          <div className="flex max-w-full items-center gap-2 rounded-lg px-3 py-1 text-sm text-text-muted">
            {conversationTitle ? <span className="max-w-[200px] truncate font-medium md:max-w-[400px]">{conversationTitle}</span> : <div className="flex items-center gap-1.5"><span>{MODELS_METADATA[selectedModel].icon}</span><span className="font-medium">{MODELS_METADATA[selectedModel].name}</span></div>}
          </div>
        </div>
      </header>

      {toastError && <div role="alert" className="absolute left-1/2 top-20 z-30 -translate-x-1/2 rounded-lg bg-red-500/90 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm">{toastError}</div>}
      {error && !toastError && <ErrorRecovery error={error} onRetry={onRetry} onOpenSettings={() => document.dispatchEvent(new CustomEvent("open-settings"))} onOpenModels={onOpenSidebar} />}

      <ChatMessages messages={messages} isStreaming={isLoading} onRetry={onRetry} />
      <MessageInput input={input} onInputChange={onInputChange} onSubmit={handleSubmit} isLoading={isLoading} stop={stop} />
    </div>
  );
}

function ErrorRecovery({ error, onRetry, onOpenSettings, onOpenModels }: { error: Error; onRetry: () => void; onOpenSettings: () => void; onOpenModels: () => void }) {
  const message = error.message || "The provider could not complete the request.";
  const normalized = message.toLowerCase();
  const isKeyError = normalized.includes("api key") || normalized.includes("unauthorized") || normalized.includes("forbidden");
  const isRetryable = normalized.includes("rate limit") || normalized.includes("quota") || normalized.includes("busy") || normalized.includes("try again");
  const isModelError = normalized.includes("model") || normalized.includes("provider");
  const action = isKeyError
    ? { label: "Open Settings", onClick: onOpenSettings }
    : isRetryable
      ? { label: "Retry", onClick: onRetry }
      : isModelError
        ? { label: "Choose another model", onClick: onOpenModels }
        : null;

  return (
    <div role="alert" className="absolute left-1/2 top-20 z-30 flex max-w-[92%] -translate-x-1/2 items-center gap-3 rounded-lg bg-red-500/95 px-4 py-2.5 text-sm font-medium text-white shadow-lg backdrop-blur-sm">
      <span>{message}</span>
      {action && <button type="button" onClick={action.onClick} className="shrink-0 rounded-md bg-white/15 px-2.5 py-1 text-xs font-semibold hover:bg-white/25">{action.label}</button>}
    </div>
  );
}
