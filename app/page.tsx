"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar/sidebar";
import { ChatArea } from "@/components/chat/chat-area";
import { ModelOption } from "@/components/sidebar/model-selector";

export default function Home() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelOption>("deepseek");

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
    </div>
  );
}
