"use client";

import { Menu, Brain, Send } from "lucide-react";
import { ModelOption } from "@/components/sidebar/model-selector";

interface ChatAreaProps {
  onOpenSidebar: () => void;
  selectedModel: ModelOption;
}

export function ChatArea({ onOpenSidebar, selectedModel }: ChatAreaProps) {
  const modelNames = {
    deepseek: "DeepSeek Chat",
    claude: "Claude 3.5 Sonnet",
    huggingface: "Hugging Face (Hermes)",
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-brand-blue relative">
      {/* Top Bar */}
      <header className="h-16 flex items-center px-4 border-b border-brand-gray/30 gap-4">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 -ml-2 text-brand-white/80 hover:text-brand-white rounded-lg hover:bg-brand-gray/50"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="font-medium text-brand-white">
          {modelNames[selectedModel]}
        </div>
      </header>

      {/* Main Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center">
        <div className="flex flex-col items-center justify-center text-brand-white/30 gap-4">
          <Brain className="w-16 h-16 opacity-50" />
          <p className="text-lg">Start a conversation</p>
        </div>
      </div>

      {/* Input Area */}
      <div className="p-4 bg-brand-blue/50 backdrop-blur-md border-t border-brand-gray/30">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2 bg-brand-gray/30 border border-brand-gray/50 rounded-xl p-2 focus-within:ring-1 focus-within:ring-brand-cyan/50 focus-within:border-brand-cyan/50 transition-all">
          <textarea
            placeholder="Send a message..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-brand-white placeholder:text-brand-white/40 px-2 py-2.5"
            rows={1}
          />
          <button className="p-2.5 bg-brand-cyan text-brand-blue rounded-lg hover:bg-brand-cyan/90 transition-colors mb-0.5">
            <Send className="w-5 h-5" />
          </button>
        </div>
        <div className="text-center mt-2 text-xs text-brand-white/30">
          OmniKey AI may produce inaccurate information about people, places, or facts.
        </div>
      </div>
    </div>
  );
}
