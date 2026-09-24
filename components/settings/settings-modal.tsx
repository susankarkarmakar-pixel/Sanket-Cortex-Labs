"use client";

import { useState, useEffect } from "react";
import { X, Lock } from "lucide-react";
import { ApiKeyInput } from "./api-key-input";
import { saveKeys, getKeys, ApiKeys } from "@/lib/key-storage";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [keys, setKeys] = useState<ApiKeys>({});
  const [savedKeys, setSavedKeys] = useState<ApiKeys>({});
  const [toast, setToast] = useState(false);

  // Only update keys when opening the modal, to avoid state lag
  // Since this component might be mounted but hidden, we load keys when it opens
  useEffect(() => {
    if (isOpen) {
      const storedKeys = getKeys();
      // Use setTimeout to avoid synchronous setState inside effect
      setTimeout(() => {
        setKeys(storedKeys);
        setSavedKeys(storedKeys);
      }, 0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    saveKeys(keys);
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
      <div className="relative w-full max-w-md bg-brand-blue border border-brand-gray/50 rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-brand-white flex items-center gap-2">
            ⚙️ Sanket Cortex Labs Configuration
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-brand-white/70 hover:text-brand-white hover:bg-brand-gray/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-brand-white/70 mb-6">
          Your keys are stored locally in your browser and never sent to our servers
        </p>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
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
            helpUrl="https://aistudio.google.com/app/apikey"
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
            label="Manus API Key"
            provider="manus"
            placeholder="sk-..."
            helpUrl="https://manus.ai"
            value={keys.manus || ""}
            onChange={(val) => handleKeyChange("manus", val)}
            isSaved={!!savedKeys.manus}
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
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-brand-gray/30">
          <div className="flex items-center justify-end gap-3 mb-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-brand-white/80 hover:text-brand-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium bg-brand-cyan text-brand-blue rounded-lg hover:bg-brand-cyan/90 transition-colors"
            >
              Save Keys
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs text-brand-white/40 text-center">
            <Lock className="w-4 h-4 shrink-0" />
            <span>🔒 Your keys are stored locally in your browser. Sanket Cortex Labs never accesses your API keys.</span>
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
