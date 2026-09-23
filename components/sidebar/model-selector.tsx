"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Bot, Sparkles, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS_METADATA } from "@/lib/ai-providers";
import { getKeys, ApiKeys } from "@/lib/key-storage";

// Update ModelOption to match ModelProvider
export type ModelOption = "deepseek" | "anthropic" | "huggingface";

interface ModelSelectorProps {
  selected: ModelOption;
  onSelect: (model: ModelOption) => void;
}

const MODELS = [
  { id: "deepseek" as const, name: MODELS_METADATA.deepseek.name, description: MODELS_METADATA.deepseek.description, icon: BrainCircuit },
  { id: "anthropic" as const, name: MODELS_METADATA.anthropic.name, description: MODELS_METADATA.anthropic.description, icon: Sparkles },
  { id: "huggingface" as const, name: MODELS_METADATA.huggingface.name, description: MODELS_METADATA.huggingface.description, icon: Bot },
] as const;

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeys>({});

  useEffect(() => {
    setTimeout(() => {
      setKeys(getKeys());
    }, 0);
    const handleKeysUpdated = () => setKeys(getKeys());
    window.addEventListener('keys-updated', handleKeysUpdated);
    return () => window.removeEventListener('keys-updated', handleKeysUpdated);
  }, []);

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
          <span className="truncate">{selectedModel.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("w-2 h-2 rounded-full", keys[selectedModel.id] ? "bg-green-500" : "bg-red-500/50")} />
          <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
        </div>
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
              const hasKey = !!keys[model.id];
              return (
                <button
                  key={model.id}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-start gap-3 px-3 py-2 text-sm transition-colors group",
                    selected === model.id
                      ? "bg-brand-cyan/20 text-brand-cyan"
                      : "text-brand-white hover:bg-brand-blue/50"
                  )}
                >
                  <ModelIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex flex-col items-start flex-1 overflow-hidden">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium truncate">{model.name}</span>
                      <div className={cn("w-2 h-2 rounded-full shrink-0 ml-2", hasKey ? "bg-green-500" : "bg-red-500/50")} />
                    </div>
                    <span className={cn(
                      "text-xs truncate w-full text-left",
                      selected === model.id ? "text-brand-cyan/70" : "text-brand-white/50 group-hover:text-brand-white/70"
                    )}>
                      {model.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
