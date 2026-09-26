"use client";

import { Check, Clipboard, Terminal, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ExecutionEvent } from "@/lib/agent/types";

export function LiveOutputConsole({ events }: { events: ExecutionEvent[] }) {
  const [clearedAt, setClearedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const visibleEvents = useMemo(() => clearedAt ? events.filter((event) => event.timestamp > clearedAt) : events, [clearedAt, events]);
  const logText = visibleEvents.map((event) => `[${formatTime(event.timestamp)}] ${event.message}${event.toolId ? ` · ${event.toolId}` : ""}`).join("\n");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [visibleEvents.length]);

  const copyLogs = async () => {
    if (!logText) return;
    await navigator.clipboard.writeText(logText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return <section className="rounded-xl border border-border-main/70 bg-sidebar-cocoa p-3 text-white" aria-label="Live output console"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Terminal className="h-4 w-4 text-cream-highlight" /><h3 className="text-xs font-semibold">Live Output</h3><span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] text-white/70">{visibleEvents.length} events</span></div><div className="flex items-center gap-1"><button type="button" onClick={() => void copyLogs()} disabled={!logText} aria-label="Copy live output" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40">{copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Clipboard className="h-3.5 w-3.5" />}</button><button type="button" onClick={() => setClearedAt(new Date().toISOString())} disabled={!visibleEvents.length} aria-label="Clear live output" className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" /></button></div></div><div className="mt-3 max-h-56 overflow-y-auto rounded-lg bg-black/25 p-3 font-mono text-[10px] leading-5 custom-scrollbar">{visibleEvents.length ? visibleEvents.map((event) => <div key={event.id} className={event.type.includes("failed") || event.type === "task-cancelled" ? "text-red-300" : event.type.includes("completed") ? "text-emerald-300" : "text-white/85"}><span className="text-white/45">[{formatTime(event.timestamp)}]</span> {event.message}{event.toolId && <span className="text-white/45"> · {event.toolId}</span>}</div>) : <p className="text-white/45">Waiting for execution logs...</p>}<div ref={bottomRef} /></div></section>;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
