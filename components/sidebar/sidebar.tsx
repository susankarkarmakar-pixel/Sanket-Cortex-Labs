"use client";

import { Plus, Settings, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector, ModelOption } from "./model-selector";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
}

export function Sidebar({ isOpen, onClose, selectedModel, onSelectModel }: SidebarProps) {
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
              <h1 className="text-xl font-bold flex items-center gap-2 text-brand-white">
                <span role="img" aria-label="brain">🧠</span> OmniKey AI
              </h1>
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
          <button className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-brand-cyan/10 hover:bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 transition-colors mb-6 font-medium">
            <Plus className="w-5 h-5" />
            New Chat
          </button>

          {/* Chat History Placeholder */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-center h-32 text-brand-white/40 text-sm italic">
              No conversations yet
            </div>
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
