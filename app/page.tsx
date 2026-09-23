"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ModelOption } from "@/components/sidebar/model-selector";
import { SettingsModal } from "@/components/settings/settings-modal";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("deepseek");

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    document.addEventListener("open-settings", handleOpenSettings);
    return () => document.removeEventListener("open-settings", handleOpenSettings);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-brand-blue">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        selectedModel={selectedModel}
        onSelectModel={setSelectedModel}
      />
      <ChatArea
        onOpenSidebar={() => setIsSidebarOpen(true)}
        selectedModel={selectedModel}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}
