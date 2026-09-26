"use client";

import { useState, useEffect } from "react";
import { Plus, Settings, X, Trash2, Download, Upload, Trash, Info, Home, MessageSquare, Bot, FolderKanban, Workflow, Network, Puzzle, FileText, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModelSelector, ModelOption } from "./model-selector";
import { ConversationSummary, getConversations, deleteConversation, clearConversations, exportConversations, importConversations } from "@/lib/chat-storage";
import { MODELS_METADATA } from "@/lib/ai-providers";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelOption;
  onSelectModel: (model: ModelOption) => void;
  onNewChat: () => void;
  onLoadConversation: (id: string) => void;
  currentConversationId: string | null;
  onOpenAbout: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
  onNewChat,
  onLoadConversation,
  currentConversationId,
  onOpenAbout,
  collapsed,
  onToggleCollapsed
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

  const handleExport = () => {
    const blob = new Blob([exportConversations()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `susan-ai-conversations-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const result = importConversations(await file.text());
        window.alert(`Imported ${result.imported} conversation${result.imported === 1 ? "" : "s"}.`);
      } catch (error) {
        window.alert(error instanceof Error ? error.message : "Could not import that file.");
      }
    };
    input.click();
  };

  const handleClear = () => {
    if (conversations.length === 0) return;
    if (window.confirm("Delete all saved conversations from this browser? This cannot be undone.")) {
      clearConversations();
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
        "fixed inset-y-0 left-0 z-50 bg-sidebar-cocoa text-white flex flex-col transition-[width,transform] duration-300 ease-in-out border-r border-white/10",
        collapsed ? "w-[78px]" : "w-[300px]",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "lg:static lg:inset-0"
      )}>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-5 custom-scrollbar">
          {/* Header */}
          <div className={cn("flex items-center mb-7", collapsed ? "justify-center" : "justify-between")}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/susan-ai-logo-sidebar-dark.png"
              alt="Susan AI — Sanket Pixel Technologies"
              className={cn("h-auto max-h-20 object-contain object-left", collapsed ? "w-10" : "w-60 max-w-full")}
            />
            <div className="flex items-center gap-1">
              <button type="button" onClick={onToggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="hidden rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:block">
                {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
              </button>
              <button type="button" onClick={onClose} aria-label="Close sidebar" className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white lg:hidden"><X className="w-5 h-5" /></button>
            </div>
          </div>

          {/* Model Selector */}
          <div className="mb-5 [&>div>button]:shadow-none [&_svg]:text-cream-highlight">
            <ModelSelector selected={selectedModel} onSelect={onSelectModel} collapsed={collapsed} />
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            title="New Chat"
            className={cn("w-full flex items-center justify-center gap-2 rounded-full bg-cream-highlight text-sidebar-cocoa shadow-sm hover:bg-white transition-colors mb-6 text-sm font-semibold", collapsed ? "px-2 py-3" : "px-4 py-3")}
          >
            <Plus className="w-4 h-4" />
            {!collapsed && "New Chat"}
          </button>

          <nav className={cn("mb-5 space-y-1", collapsed && "hidden")} aria-label="Primary navigation">
            <SidebarNavItem icon={<Home className="h-4 w-4" />} label="Home" onClick={() => window.location.reload()} />
            <SidebarNavItem icon={<MessageSquare className="h-4 w-4" />} label="Chat" />
            <SidebarNavItem icon={<Bot className="h-4 w-4" />} label="Agent Mode" active />
            <SidebarNavItem icon={<FolderKanban className="h-4 w-4" />} label="Projects" />
            <SidebarNavItem icon={<Workflow className="h-4 w-4" />} label="Workflows" />
            <SidebarNavItem icon={<Network className="h-4 w-4" />} label="Knowledge Base" />
            <SidebarNavItem icon={<Puzzle className="h-4 w-4" />} label="Plugins" />
            <SidebarNavItem icon={<FileText className="h-4 w-4" />} label="Documents" />
          </nav>
          {!collapsed && <><div className="mb-3 flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45"><span>Pinned agents</span><span>⌃</span></div>
          <div className="mb-4 space-y-1"><PinnedAgent label="General Assistant" /><PinnedAgent label="Data & Report Agent" /><PinnedAgent label="Study & Research Agent" /></div></>}

          {/* Chat History */}
          <div className={cn("min-h-0 flex-1 pr-1", collapsed && "hidden")}>
            {conversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-white/45 text-sm">
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
                        isActive ? "bg-sidebar-cocoa-soft text-white shadow-sm border border-white/10" : "text-white/65 hover:bg-white/10 hover:text-white border border-transparent"
                      )}
                    >
                      <span className="shrink-0 text-[13px] opacity-80">{IconStr}</span>
                      <div className="flex-1 min-w-0 flex flex-col">
                        <span className="truncate font-medium leading-tight">{conv.title}</span>
                        <span className="text-[10px] text-white/45 mt-1">{dateStr}</span>
                      </div>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={(e) => handleDelete(e, conv.id)}
                        className={cn(
                          "absolute right-2 p-1.5 rounded-md text-red-300 hover:bg-red-500/20 hover:text-red-100 transition-colors opacity-0 group-hover:opacity-100",
                          isActive && "opacity-100 bg-sidebar-cocoa-soft" // Always show on active for touch devices
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

          <div className={cn("grid grid-cols-1 gap-1.5 mt-3", collapsed && "hidden")}>
            <button type="button" onClick={handleExport} title="Export conversations" className="flex items-center justify-start gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 hover:text-white">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button type="button" onClick={handleImport} title="Import conversations" className="flex items-center justify-start gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/75 hover:bg-white/10 hover:text-white">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button type="button" onClick={handleClear} title="Delete all conversations" className="flex items-center justify-start gap-2 rounded-lg border border-white/10 px-3 py-2.5 text-xs text-white/75 hover:bg-red-500/15 hover:text-red-200">
              <Trash className="h-3.5 w-3.5" /> Clear
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className={cn("border-t border-white/10 flex flex-col gap-3", collapsed ? "items-center p-3" : "p-5")}>
          <button
            onClick={() => document.dispatchEvent(new CustomEvent('open-settings'))}
            title="Settings"
            className={cn("flex items-center gap-2 text-white/75 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 text-sm font-medium", collapsed ? "justify-center" : "w-full")}
          >
            <Settings className="w-4 h-4" />
            {!collapsed && <span>Settings</span>}
          </button>
          <button
            onClick={onOpenAbout}
            title="About"
            className={cn("flex items-center gap-2 text-white/75 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/10 text-sm font-medium", collapsed ? "justify-center" : "w-full")}
          >
            <Info className="w-4 h-4" />
            {!collapsed && <span>About</span>}
          </button>
          {!collapsed && <div className="text-center text-[10px] text-white/40">
            © 2026 Sanket Pixel Technologies
          </div>}
        </div>
      </div>
    </>
  );
}

function SidebarNavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return <button type="button" onClick={onClick || (() => window.dispatchEvent(new CustomEvent("workspace-placeholder", { detail: label })))} className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors", active ? "bg-sidebar-cocoa-soft text-white" : "text-white/70 hover:bg-white/10 hover:text-white")}><span className={active ? "text-cream-highlight" : "text-white/65"}>{icon}</span><span>{label}</span>{active && <span className="ml-auto rounded-full bg-cream-highlight px-2 py-0.5 text-[9px] font-bold text-sidebar-cocoa">NEW</span>}</button>;
}

function PinnedAgent({ label }: { label: string }) {
  return <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("workspace-placeholder", { detail: label }))} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs text-white/70 hover:bg-white/10 hover:text-white"><span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/10 text-cream-highlight">✦</span><span className="truncate">{label}</span></button>;
}
