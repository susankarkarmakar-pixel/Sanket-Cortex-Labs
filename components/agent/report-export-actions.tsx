"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import { AgentTask } from "@/lib/agent/types";
import { CsvTableSummary } from "@/lib/agent/tools/file-analysis";
import { downloadReport, ReportFormat } from "@/lib/agent/report-generator";

interface ReportExportActionsProps { task: AgentTask; output?: string; table?: CsvTableSummary; }

export function ReportExportActions({ task, output, table }: ReportExportActionsProps) {
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const sourceFilename = task.attachments[0]?.filename || "Susan AI analysis";
  const reportData = { title: `${sourceFilename.replace(/\.[^.]+$/, "")} Report`, goal: task.goal, sourceFilename, generatedAt: new Date().toLocaleString(), summary: output || "No analysis summary is available yet.", table };

  const exportReport = async (format: ReportFormat) => {
    setBusy(format);
    setMessage(null);
    try { await downloadReport(format, reportData); setMessage(`${format.toUpperCase()} report downloaded.`); } catch (error) { setMessage(error instanceof Error ? error.message : "Report export failed."); } finally { setBusy(null); }
  };

  return <div className="mt-3 rounded-lg border border-border-main/70 bg-surface p-3"><div className="flex items-center gap-2"><Download className="h-4 w-4 text-accent" /><p className="text-xs font-semibold text-text-main">Export report</p></div><div className="mt-2 flex flex-wrap gap-2"><ExportButton format="pdf" label="PDF" icon={<FileText className="h-3.5 w-3.5" />} busy={busy} onClick={exportReport} /><ExportButton format="docx" label="DOCX" icon={<FileText className="h-3.5 w-3.5" />} busy={busy} onClick={exportReport} /><ExportButton format="xlsx" label="XLSX" icon={<FileSpreadsheet className="h-3.5 w-3.5" />} busy={busy} onClick={exportReport} /></div>{message && <p role="status" className="mt-2 text-[10px] text-text-muted">{message}</p>}</div>;
}

function ExportButton({ format, label, icon, busy, onClick }: { format: ReportFormat; label: string; icon: React.ReactNode; busy: ReportFormat | null; onClick: (format: ReportFormat) => void }) { const isBusy = busy === format; return <button type="button" onClick={() => void onClick(format)} disabled={Boolean(busy)} className="flex items-center gap-1.5 rounded-lg border border-border-main/70 px-2.5 py-2 text-xs font-semibold text-text-main hover:bg-black/5 disabled:cursor-wait disabled:opacity-60">{isBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}{isBusy ? "Preparing…" : label}</button>; }
