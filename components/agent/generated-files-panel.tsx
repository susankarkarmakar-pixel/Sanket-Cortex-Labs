"use client";
import { CheckCircle2, Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { AgentTask } from "@/lib/agent/types";
import { CsvTableSummary } from "@/lib/agent/tools/file-analysis";
import { downloadReport, ReportFormat } from "@/lib/agent/report-generator";

type Execution = { output?: string } | null;
interface GeneratedFilesPanelProps { task: AgentTask | null; execution: Execution; }
const formats: Array<{ format: ReportFormat; label: string; extension: string; icon: React.ReactNode; estimate: string }> = [
  { format: "pdf", label: "PDF Report", extension: ".pdf", icon: <FileText className="h-4 w-4" />, estimate: "Formatted report" },
  { format: "docx", label: "DOCX Report", extension: ".docx", icon: <FileText className="h-4 w-4" />, estimate: "Editable document" },
  { format: "xlsx", label: "XLSX Report", extension: ".xlsx", icon: <FileSpreadsheet className="h-4 w-4" />, estimate: "Analysis workbook" },
];
export function GeneratedFilesPanel({ task, execution }: GeneratedFilesPanelProps) {
  const [status, setStatus] = useState<Partial<Record<ReportFormat, "generating" | "ready">>>({});
  if (!task) return <EmptyGeneratedFiles />;
  const sourceFilename = task.attachments[0]?.filename || "Susan AI analysis";
  const reportData = { title: `${sourceFilename.replace(/\.[^.]+$/, "")} Report`, goal: task.goal, sourceFilename, generatedAt: new Date().toLocaleString(), summary: execution?.output || "No analysis summary is available yet.", table: undefined as CsvTableSummary | undefined };
  const exportFile = async (format: ReportFormat) => { setStatus((current) => ({ ...current, [format]: "generating" })); try { await downloadReport(format, reportData); setStatus((current) => ({ ...current, [format]: "ready" })); } finally { setStatus((current) => ({ ...current, [format]: current[format] === "generating" ? "ready" : current[format] })); } };
  return <section aria-label="Generated files" className="rounded-xl border border-border-main/70 bg-surface p-3"><div className="flex items-center justify-between gap-2"><div><h3 className="text-sm font-semibold text-text-main">Generated Files</h3><p className="mt-1 text-[10px] text-text-muted">Exported reports stay available in this workspace.</p></div><span className="text-[10px] font-semibold text-accent">{Object.values(status).filter((item) => item === "ready").length}/3 ready</span></div><div className="mt-3 space-y-2">{formats.map((item) => { const current = status[item.format]; const base = safeBaseName(reportData.title); return <div key={item.format} className="flex items-center gap-2 rounded-lg border border-border-main/60 bg-bg-main p-2.5"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">{item.icon}</span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold text-text-main">{base}{item.extension}</p><p className="text-[10px] text-text-muted">{current === "generating" ? "Generating…" : current === "ready" ? "Ready · Downloaded" : item.estimate}</p></div>{current === "generating" ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" /> : current === "ready" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" /> : <button type="button" onClick={() => void exportFile(item.format)} className="flex shrink-0 items-center gap-1 rounded-md border border-border-main/70 px-2 py-1.5 text-[10px] font-semibold text-text-main hover:bg-cream-highlight hover:text-accent"><Download className="h-3 w-3" />Export</button>}</div>; })}</div></section>;
}
function EmptyGeneratedFiles() { return <section aria-label="Generated files" className="rounded-xl border border-dashed border-border-main bg-surface/60 p-4 text-center"><FileText className="mx-auto h-5 w-5 text-accent" /><p className="mt-2 text-xs font-semibold text-text-main">Generated Files</p><p className="mt-1 text-[10px] leading-5 text-text-muted">Exported PDF, DOCX, and XLSX reports will appear here.</p></section>; }
function safeBaseName(title: string): string { return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "susan-ai-report"; }
