"use client";

import { useState } from "react";
import { ChevronDown, Bot, Sparkles, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModelOption = "deepseek" | "claude" | "huggingface";

interface ModelSelectorProps {
  selected: ModelOption;
  onSelect: (model: ModelOption) => void;
}

const MODELS = [
  { id: "deepseek", name: "DeepSeek Chat", icon: BrainCircuit },
  { id: "claude", name: "Claude 3.5 Sonnet", icon: Sparkles },
  { id: "huggingface", name: "Hugging Face (Hermes)", icon: Bot },
] as const;

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedModel = MODELS.find(m => m.id === selected) || MODELS[0];
  const Icon = selectedModel.icon;

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-brand-gray/50 hover:bg-brand-gray/80 rounded-lg border border-brand-gray transition-colors text-sm text-brand-white"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-brand-cyan" />
          <span>{selectedModel.name}</span>
        </div>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1 bg-brand-gray border border-brand-gray/50 rounded-lg shadow-lg overflow-hidden">
            {MODELS.map((model) => {
              const ModelIcon = model.icon;
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id as ModelOption);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors",
                    selected === model.id
                      ? "bg-brand-cyan/20 text-brand-cyan"
                      : "text-brand-white hover:bg-brand-blue/50"
                  )}
                >
                  <ModelIcon className="w-4 h-4" />
                  <span>{model.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
