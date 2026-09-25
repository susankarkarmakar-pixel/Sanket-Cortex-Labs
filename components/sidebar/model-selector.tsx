"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Bot, Sparkles, BrainCircuit, Globe, Cpu, Hexagon, Zap, Shield, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { INSTANT_CHAT_PROVIDERS, MODELS_METADATA, ModelProvider } from "@/lib/ai-providers";
import { getApiKey, getKeys, ApiKeys } from "@/lib/key-storage";
import { CustomProvider, getCustomProviders } from "@/lib/custom-providers";

// Update ModelOption to match ModelProvider
export type ModelOption = Exclude<ModelProvider, "manus"> | string;

interface ModelSelectorProps {
  selected: ModelOption;
  onSelect: (model: ModelOption) => void;
}

const MODEL_ICONS: Record<Exclude<ModelProvider, "manus">, LucideIcon> = {
  deepseek: BrainCircuit,
  anthropic: Sparkles,
  huggingface: Bot,
  google: Globe,
  openai: Cpu,
  qwen: Hexagon,
  kimi: Zap,
  sarvam: Shield,
  openrouter: Globe,
};

const MODELS = INSTANT_CHAT_PROVIDERS.map((id) => ({
  id,
  name: MODELS_METADATA[id].name,
  description: MODELS_METADATA[id].description,
  icon: MODEL_ICONS[id],
}));

export function ModelSelector({ selected, onSelect }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keys, setKeys] = useState<ApiKeys>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [customProviders, setCustomProviders] = useState<CustomProvider[]>([]);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setTimeout(() => {
      setKeys(getKeys());
      setCustomProviders(getCustomProviders());
    }, 0);
    const handleKeysUpdated = () => setKeys(getKeys());
    const handleCustomProvidersUpdated = () => setCustomProviders(getCustomProviders());
    window.addEventListener('keys-updated', handleKeysUpdated);
    window.addEventListener('custom-providers-updated', handleCustomProvidersUpdated);
    return () => { window.removeEventListener('keys-updated', handleKeysUpdated); window.removeEventListener('custom-providers-updated', handleCustomProvidersUpdated); };
  }, []);

  const availableModels = [...MODELS, ...customProviders.map((provider) => ({ id: provider.id, name: provider.name, description: provider.model, icon: Globe }))];
  const selectedModel = availableModels.find(m => m.id === selected) || availableModels[0];
  const Icon = selectedModel.icon;
  const selectedIndex = Math.max(0, availableModels.findIndex((model) => model.id === selected));

  const openSelector = (index = selectedIndex) => {
    setActiveIndex(index);
    setIsOpen(true);
    window.requestAnimationFrame(() => optionRefs.current[index]?.focus());
  };

  const moveActive = (direction: 1 | -1) => {
    const nextIndex = (activeIndex + direction + availableModels.length) % availableModels.length;
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="relative w-full">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openSelector();
          }
        }}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select model, current model ${selectedModel.name}`}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-surface hover:bg-black/5 rounded-xl border border-border-main/50 transition-colors text-sm text-text-main shadow-sm"
      >
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-accent" />
          <span className="truncate font-medium">{selectedModel.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={cn("w-1.5 h-1.5 rounded-full", getApiKey(selectedModel.id, keys) ? "bg-green-500" : "bg-red-400")} />
          <ChevronDown className={cn("w-4 h-4 text-text-muted transition-transform", isOpen && "rotate-180")} />
        </div>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div role="listbox" aria-label="Available AI models" className="absolute z-20 w-full mt-1.5 bg-surface border border-border-main rounded-xl shadow-lg overflow-hidden py-1">
            {availableModels.map((model) => {
              const ModelIcon = model.icon;
              const hasKey = !!getApiKey(model.id, keys);
              const modelIndex = availableModels.findIndex((candidate) => candidate.id === model.id);
              return (
                <button
                  key={model.id}
                  type="button"
                  role="option"
                  tabIndex={activeIndex === modelIndex ? 0 : -1}
                  aria-selected={selected === model.id}
                  ref={(element) => { optionRefs.current[modelIndex] = element; }}
                  onClick={() => {
                    onSelect(model.id);
                    setIsOpen(false);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveActive(1);
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveActive(-1);
                    } else if (event.key === "Home") {
                      event.preventDefault();
                      setActiveIndex(0);
                      optionRefs.current[0]?.focus();
                    } else if (event.key === "End") {
                      event.preventDefault();
                      setActiveIndex(availableModels.length - 1);
                      optionRefs.current[availableModels.length - 1]?.focus();
                    } else if (event.key === "Escape") {
                      event.preventDefault();
                      setIsOpen(false);
                    }
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
