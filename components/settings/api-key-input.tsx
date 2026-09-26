"use client";

import { useState } from "react";
import { Eye, EyeOff, CheckCircle2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ApiKeyInputProps {
  label: string;
  provider: string;
  placeholder: string;
  helpUrl: string;
  helpText?: string;
  value: string;
  onChange: (val: string) => void;
  isSaved: boolean;
}

export function ApiKeyInput({
  label,
  placeholder,
  helpUrl,
  helpText,
  value,
  onChange,
  isSaved,
}: ApiKeyInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="flex flex-col gap-1.5 mb-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text-main flex items-center gap-2">
          {label}
          {isSaved && <CheckCircle2 className="w-4 h-4 text-green-600" />}
        </label>
        <a
          href={helpUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline flex items-center gap-1"
        >
          Get Key <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative">
        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            "w-full bg-surface border border-border-main rounded-xl px-3 py-2.5 text-sm text-text-main outline-none transition-colors",
            "focus:border-text-main focus:ring-1 focus:ring-text-main/20",
            isSaved && "border-green-600/30 bg-green-50/50"
          )}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {helpText && <p className="text-xs leading-5 text-text-muted">{helpText}</p>}
    </div>
  );
}
