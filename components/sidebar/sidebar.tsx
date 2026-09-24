"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector, ModelOption } from "./model-selector";
import { ConversationSummary, getConversations, deleteConversation } from "@/lib/chat-storage";
import { MODELS_METADATA } from "@/lib/ai-providers";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  onNewChat: () => void;
  onLoadConversation: (id: string) => void;
  currentConversationId: string | null;
}

export function Sidebar({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  onNewChat,
  onLoadConversation,
  currentConversationId
}: SidebarProps) {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);

  useEffect(() => {
    // Initial load
    setTimeout(() => {
      setConversations(getConversations());
    }, 0);

    // Listen for updates
    const handleUpdate = () => setConversations(getConversations());
    window.addEventListener('conversations-updated', handleUpdate);
    return () => window.removeEventListener('conversations-updated', handleUpdate);
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
    if (currentConversationId === id) {
      onNewChat();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-bg-sidebar flex flex-col transition-transform duration-300 ease-in-out border-r border-border-main/40",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:static lg:inset-0"
      )}>
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/susan-logo.svg" alt="Susan AI Logo" className="w-8 h-8 object-contain opacity-80" />
                <h1 className="text-[1.3rem] font-medium text-text-main tracking-tight">
                  Susan AI
                </h1>
              </div>
              <span className="text-[0.65rem] text-text-muted mt-1 pl-1">
                by Sanket Pixel Technologies
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-black/5 lg:hidden text-text-muted hover:text-text-main"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Model Selector */}
          <div className="mb-6">
            <ModelSelector selected={selectedModel} onSelect={onSelectModel} />
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-surface text-text-main shadow-sm border border-border-main/50 hover:bg-black/5 transition-colors mb-6 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                No conversations yet
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {conversations.map((conv) => {
                  const isActive = conv.id === currentConversationId;
                  const meta = MODELS_METADATA[conv.model as keyof typeof MODELS_METADATA];
                  const IconStr = meta?.icon || "🧠";
                  const dateStr = new Date(conv.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                  return (
                    <button
                      key={conv.id}
                      onClick={() => {
                        onLoadConversation(conv.id);
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={cn(
                        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left transition-colors relative overflow-hidden",
                        isActive ? "bg-surface text-text-main shadow-sm border border-border-main/50" : "text-text-muted hover:bg-black/5 hover:text-text-main border border-transparent"
                      )}
                    >
                      <span className="shrink-0 text-[13px] opacity-80">{IconStr}</span>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="truncate font-medium leading-tight">{conv.title}</span>
                        <span className="text-[10px] text-text-muted mt-1 opacity-70">{dateStr}</span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(e, conv.id)}
                        className={cn(
                          "absolute right-2 p-1.5 rounded-md text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100",
                          isActive && "opacity-100 bg-surface" // Always show on active for touch devices
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-main/40 flex flex-col gap-4">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
            className="flex items-center gap-2 text-text-muted hover:text-text-main transition-colors p-2 rounded-xl hover:bg-black/5 w-full text-sm font-medium"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
          <div className="text-center text-[10px] text-text-muted opacity-60">
            © 2026 Sanket Pixel Technologies
          </div>
        </div>
      </div>
    </>
  );
}
