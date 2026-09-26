"use client";

import { CheckCircle2, CircleDot, ClipboardList, Clock3, Loader2, XCircle, Zap } from "lucide-react";
import { ExecutionEvent } from "@/lib/agent/types";

export function ExecutionTimeline({ events }: { events: ExecutionEvent[] }) {
  if (events.length === 0) return <div className="rounded-xl border border-dashed border-border-main bg-surface/60 p-4 text-center"><Clock3 className="mx-auto h-5 w-5 text-accent" /><p className="mt-2 text-xs text-text-muted">Execution activity will appear here.</p></div>;
  return <div className="space-y-3">{events.map((event) => <div key={event.id} className="flex gap-2.5"><EventIcon type={event.type} /><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold text-text-main">{event.message}</p><time className="shrink-0 text-[10px] text-text-muted">{formatTime(event.timestamp)}</time></div>{event.toolId && <p className="mt-0.5 text-[10px] text-text-muted">Tool: {event.toolId}</p>}</div></div>)}</div>;
}

function EventIcon({ type }: { type: ExecutionEvent["type"] }) {
  if (type === "tool-completed" || type === "task-completed") return <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />;
  if (type === "tool-failed" || type === "task-failed" || type === "task-cancelled") return <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />;
  if (type === "tool-started") return <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-accent" />;
  if (type === "plan-created") return <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-accent" />;
  if (type === "task-created") return <Zap className="mt-0.5 h-4 w-4 shrink-0 text-accent" />;
  return <CircleDot className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
