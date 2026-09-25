"use client";

import { useState, useEffect, useRef } from "react";
import { X, Lock, Trash2, ExternalLink } from "lucide-react";
import { ApiKeyInput } from "./api-key-input";
import { saveKeys, getKeys, clearKeys, getKeyStorageMode, ApiKeys, KeyStorageMode } from "@/lib/key-storage";
import { FREE_TIER_DIRECTORY, MODELS_METADATA } from "@/lib/ai-providers";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [savedKeys, setSavedKeys] = useState<ApiKeys>({});
  const [toast, setToast] = useState(false);
  const [storageMode, setStorageMode] = useState<KeyStorageMode>("session");
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Only update keys when opening the modal, to avoid state lag
  // Since this component might be mounted but hidden, we load keys when it opens
  useEffect(() => {
    if (isOpen) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      const storedKeys = getKeys();
      const storedMode = getKeyStorageMode();
      // Use setTimeout to avoid synchronous setState inside effect
      setTimeout(() => {
        setKeys(storedKeys);
        setSavedKeys(storedKeys);
        setStorageMode(storedMode);
      }, 0);
      window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      previouslyFocused.current?.focus();
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !modalRef.current) return;
      const focusable = Array.from(modalRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled]), select:not([disabled])"
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveKeys(keys, storageMode);
    setSavedKeys(keys);

    // Show toast
    setToast(true);
    setTimeout(() => {
      setToast(false);
      onClose();
    }, 1500);
  };

  const handleKeyChange = (provider: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [provider]: value }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="susan-settings-title" className="relative w-full max-w-md bg-surface border border-border-main/50 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 id="susan-settings-title" className="text-xl font-semibold text-text-main flex items-center gap-2">
            ⚙️ Susan AI Configuration
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-text-muted mb-6">
          Each chat request sends the selected key through this app to the chosen provider; Susan AI does not persist it on the server.
        </p>

        <div role="alert" className="mb-5 rounded-xl border border-amber-500/40 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-semibold">Important: browser-local BYOK storage</p>
          <p className="mt-1 text-xs leading-relaxed">
            Session-only keys are removed when the browser session ends. If you enable browser persistence, keys are stored using Base64 encoding; Base64 is <strong>not encryption</strong>. Use provider-restricted keys with minimal permissions, avoid shared devices, and clear your keys before handing this device to someone else.
          </p>
        </div>

        <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border-main/50 bg-black/[.02] p-3">
          <input type="checkbox" checked={storageMode === "browser"} onChange={(event) => setStorageMode(event.target.checked ? "browser" : "session")} className="mt-0.5 h-4 w-4 accent-accent" />
          <span className="text-sm text-text-main">
            <span className="block font-semibold">Remember keys in this browser</span>
            <span className="mt-1 block text-xs leading-relaxed text-text-muted">Off by default: session-only keys are removed when this browser session ends. Turn this on only on a trusted personal device.</span>
          </span>
        </label>

        <div className="mb-5 rounded-xl border border-green-600/20 bg-green-50/60 p-3">
          <h3 className="mb-2 text-sm font-semibold text-text-main">Free-tier options</h3>
          <div className="space-y-2">
            {FREE_TIER_DIRECTORY.map((item) => (
              <div key={item.provider} className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <p className="font-medium text-text-main">{item.title} <span className="font-normal text-green-700">· {item.model}</span></p>
                  <p className="text-text-muted">{item.note}</p>
                </div>
                <a href={MODELS_METADATA[item.provider].setupUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-accent hover:underline" aria-label={`Get ${item.title} API key`}>Get key <ExternalLink className="inline h-3 w-3" /></a>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-text-muted">“Free-tier” means the provider may offer free quota; it is not a guarantee of unlimited or permanent free access.</p>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
          <ApiKeyInput
            label="DeepSeek API Key"
            provider="deepseek"
            placeholder="sk-..."
            helpUrl="https://platform.deepseek.com"
            value={keys.deepseek || ""}
            onChange={(val) => handleKeyChange("deepseek", val)}
            isSaved={!!savedKeys.deepseek}
          />
          <ApiKeyInput
            label="Anthropic (Claude) API Key"
            provider="anthropic"
            placeholder="sk-ant-..."
            helpUrl="https://console.anthropic.com"
            value={keys.anthropic || ""}
            onChange={(val) => handleKeyChange("anthropic", val)}
            isSaved={!!savedKeys.anthropic}
          />
          <ApiKeyInput
            label="Hugging Face API Token"
            provider="huggingface"
            placeholder="hf_..."
            helpUrl="https://huggingface.co/settings/tokens"
            value={keys.huggingface || ""}
            onChange={(val) => handleKeyChange("huggingface", val)}
            isSaved={!!savedKeys.huggingface}
          />
          <ApiKeyInput
            label="Google API Key (Gemini)"
            provider="google"
            placeholder="AIza..."
            helpUrl="https://aistudio.google.com/apikey"
            value={keys.google || ""}
            onChange={(val) => handleKeyChange("google", val)}
            isSaved={!!savedKeys.google}
          />
          <ApiKeyInput
            label="OpenAI API Key (ChatGPT)"
            provider="openai"
            placeholder="sk-..."
            helpUrl="https://platform.openai.com/api-keys"
            value={keys.openai || ""}
            onChange={(val) => handleKeyChange("openai", val)}
            isSaved={!!savedKeys.openai}
          />
          <ApiKeyInput
            label="Qwen API Key"
            provider="qwen"
            placeholder="sk-..."
            helpUrl="https://dashscope.console.aliyun.com/apiKey"
            value={keys.qwen || ""}
            onChange={(val) => handleKeyChange("qwen", val)}
            isSaved={!!savedKeys.qwen}
          />
          <ApiKeyInput
            label="Kimi API Key"
            provider="kimi"
            placeholder="sk-..."
            helpUrl="https://platform.moonshot.cn/console/api-keys"
            value={keys.kimi || ""}
            onChange={(val) => handleKeyChange("kimi", val)}
            isSaved={!!savedKeys.kimi}
          />
          <ApiKeyInput
            label="Sarvam API Key"
            provider="sarvam"
            placeholder="sk-..."
            helpUrl="https://sarvam.ai"
            value={keys.sarvam || ""}
            onChange={(val) => handleKeyChange("sarvam", val)}
            isSaved={!!savedKeys.sarvam}
          />
          <ApiKeyInput
            label="OpenRouter API Key (free router)"
            provider="openrouter"
            placeholder="sk-or-v1-..."
            helpUrl="https://openrouter.ai/settings/keys"
            value={keys.openrouter || ""}
            onChange={(val) => handleKeyChange("openrouter", val)}
            isSaved={!!savedKeys.openrouter}
          />
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-border-main/50">
          <div className="flex items-center justify-end gap-3 mb-4">
            <button
              onClick={() => {
                if (window.confirm("Remove all saved API keys from this browser?")) {
                  clearKeys();
                  setKeys({});
                  setSavedKeys({});
                }
              }}
              className="mr-auto flex items-center gap-1.5 px-2 py-2 text-sm font-medium text-red-600 hover:text-red-700 transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Clear keys
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-main transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-colors shadow-sm"
            >
              Save Keys
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-text-muted/70 text-center">
            <Lock className="w-4 h-4 shrink-0" />
            <span>Your keys are stored locally and used only to route requests to the selected provider. Review provider terms before entering production credentials.</span>
          </div>
        </div>

        {/* Toast Notification */}
        {toast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-in fade-in slide-in-from-top-4">
            Keys saved successfully!
          </div>
        )}

      </div>
    </div>
  );
}
