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
        "fixed inset-y-0 left-0 z-50 w-[280px] bg-brand-blue flex flex-col transition-transform duration-300 ease-in-out border-r border-brand-gray/30",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:static lg:inset-0"
      )}>
        <div className="flex-1 flex flex-col p-4 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Sanket Cortex Labs Logo" className="w-8 h-8 object-contain" />
                <h1 className="text-xl font-bold text-brand-white">
                  Susan AI
                </h1>
              </div>
              <span className="text-xs text-brand-gray/70 mt-1 pl-1 opacity-70">
                by Sanket Cortex Labs
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-brand-gray/50 lg:hidden text-brand-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Model Selector */}
          <div className="mb-4">
            <ModelSelector selected={selectedModel} onSelect={onSelectModel} />
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 transition-colors mb-6 font-medium"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-brand-white/40 text-sm italic">
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
                        "group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition-colors relative overflow-hidden",
                        isActive ? "bg-brand-gray/80 text-brand-white" : "text-brand-white/70 hover:bg-brand-gray/50 hover:text-brand-white"
                      )}
                    >
                      <span className="shrink-0 text-base">{IconStr}</span>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="truncate font-medium leading-tight">{conv.title}</span>
                        <span className="text-[10px] text-brand-white/40 mt-0.5">{dateStr}</span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(e, conv.id)}
                        className={cn(
                          "absolute right-2 p-1.5 rounded-md text-red-400 hover:bg-red-400/20 hover:text-red-300 transition-colors opacity-0 group-hover:opacity-100",
                          isActive && "opacity-100" // Always show on active for touch devices
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
        <div className="p-4 border-t border-brand-gray/30">
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
            className="flex items-center gap-2 text-brand-white/80 hover:text-brand-white transition-colors p-2 rounded-lg hover:bg-brand-gray/50 w-full"
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </>
  );
}
