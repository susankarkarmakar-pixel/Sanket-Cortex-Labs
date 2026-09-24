"use client";

import { useState, useEffect } from "react";
import { ChevronDown, Bot, Sparkles, BrainCircuit, Globe, Cpu, Hexagon, Zap, Star, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODELS_METADATA, ModelProvider } from "@/lib/ai-providers";
import { getKeys, ApiKeys } from "@/lib/key-storage";

// Update ModelOption to match ModelProvider
export type ModelOption = ModelProvider;

interface ModelSelectorProps {
  selected: ModelOption;
  onSelect: (model: ModelOption) => void;
}

const MODELS = [
  { id: "deepseek" as const, name: MODELS_METADATA.deepseek.name, description: MODELS_METADATA.deepseek.description, icon: BrainCircuit },
  { id: "anthropic" as const, name: MODELS_METADATA.anthropic.name, description: MODELS_METADATA.anthropic.description, icon: Sparkles },
  { id: "huggingface" as const, name: MODELS_METADATA.huggingface.name, description: MODELS_METADATA.huggingface.description, icon: Bot },
  { id: "google" as const, name: MODELS_METADATA.google.name, description: MODELS_METADATA.google.description, icon: Globe },
  { id: "openai" as const, name: MODELS_METADATA.openai.name, description: MODELS_METADATA.openai.description, icon: Cpu },
  { id: "qwen" as const, name: MODELS_METADATA.qwen.name, description: MODELS_METADATA.qwen.description, icon: Hexagon },
  { id: "kimi" as const, name: MODELS_METADATA.kimi.name, description: MODELS_METADATA.kimi.description, icon: Zap },
  { id: "manus" as const, name: MODELS_METADATA.manus.name, description: MODELS_METADATA.manus.description, icon: Star },
  { id: "sarvam" as const, name: MODELS_METADATA.sarvam.name, description: MODELS_METADATA.sarvam.description, icon: Shield },
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
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface hover:bg-black/5 rounded-xl border border-border-main/50 transition-colors text-sm text-text-main shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="truncate font-medium">{selectedModel.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("w-1.5 h-1.5 rounded-full", keys[selectedModel.id] ? "bg-green-500" : "bg-red-400")} />
          <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute z-20 w-full mt-1.5 bg-surface border border-border-main rounded-xl shadow-lg overflow-hidden py-1">
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
                    "w-full flex items-start gap-3 px-3 py-2.5 text-sm transition-colors group",
                    selected === model.id
                      ? "bg-black/5 text-text-main"
                      : "text-text-main hover:bg-black/5"
                  )}
                >
                  <ModelIcon className={cn("w-4 h-4 mt-0.5 shrink-0", selected === model.id ? "text-accent" : "text-text-muted group-hover:text-text-main")} />
                  <div className="flex flex-col items-start flex-1 overflow-hidden">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium truncate">{model.name}</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full shrink-0 ml-2", hasKey ? "bg-green-500" : "bg-red-400")} />
                    </div>
                    <span className={cn(
                      "text-[11px] truncate w-full text-left mt-0.5",
                      selected === model.id ? "text-text-muted" : "text-text-muted/70 group-hover:text-text-muted"
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
