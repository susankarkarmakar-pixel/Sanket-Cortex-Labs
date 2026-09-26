"use client";

import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaInstallButton({ collapsed = false }: { collapsed?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches
        || (navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
      setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent)
        || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));
    }, 0);

    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowInstructions(false);
    };

    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const install = async () => {
    if (isIos || !installPrompt) {
      setShowInstructions(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void install()}
        title="Install Susan AI as an app"
        aria-label="Install Susan AI as an app"
        className={`flex items-center gap-2 rounded-xl p-2 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white ${collapsed ? "justify-center" : "w-full"}`}
      >
        <Download className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Install app</span>}
      </button>

      {showInstructions && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowInstructions(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="w-full max-w-sm rounded-2xl border border-border-main bg-surface p-5 text-text-main shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-highlight text-accent"><Smartphone className="h-5 w-5" /></span>
                <div><h2 id="install-app-title" className="font-semibold">Install Susan AI</h2><p className="text-xs text-text-muted">Add it to your device for an app-style window.</p></div>
              </div>
              <button type="button" aria-label="Close install instructions" onClick={() => setShowInstructions(false)} className="rounded-lg p-2 text-text-muted hover:bg-bg-main"><X className="h-4 w-4" /></button>
            </div>
            {isIos ? (
              <ol className="mt-4 space-y-3 text-sm leading-6 text-text-muted">
                <li>1. Open this page in Safari and tap the <Share className="mx-1 inline h-4 w-4 text-accent" aria-label="Share" />Share button.</li>
                <li>2. Choose <strong className="text-text-main">Add to Home Screen</strong>, then tap <strong className="text-text-main">Add</strong>.</li>
              </ol>
            ) : (
              <p className="mt-4 text-sm leading-6 text-text-muted">Open your browser menu and choose <strong className="text-text-main">Install app</strong> or <strong className="text-text-main">Add to Home screen</strong>. In supported browsers, the install option may also appear in the address bar.</p>
            )}
            <p className="mt-4 rounded-xl bg-bg-main p-3 text-xs leading-5 text-text-muted">Susan AI opens in its own app window. Internet access is still needed for AI-provider requests.</p>
            <button type="button" onClick={() => setShowInstructions(false)} className="mt-4 w-full rounded-xl bg-sidebar-cocoa px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90">Got it</button>
          </section>
        </div>
      )}
    </>
  );
}
