"use client";

import { BarChart3, LineChart } from "lucide-react";
import { CsvTableSummary } from "@/lib/agent/tools/file-analysis";

export function VisualizationPanel({ table }: { table: CsvTableSummary | undefined }) {
  if (!table?.chartData?.points.length) return <div className="rounded-xl border border-dashed border-border-main bg-surface/60 p-5 text-center"><BarChart3 className="mx-auto h-5 w-5 text-accent" /><p className="mt-2 text-sm font-semibold text-text-main">No chartable numeric data</p><p className="mt-1 text-xs leading-5 text-text-muted">Attach a CSV with at least one numeric column to generate a chart.</p></div>;
  const { column, points } = table.chartData;
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = 560;
  const chartHeight = 220;
  const leftPadding = 42;
  const bottomPadding = 42;
  const plotWidth = chartWidth - leftPadding - 12;
  const plotHeight = chartHeight - bottomPadding - 12;
  const barWidth = Math.max(12, Math.min(34, plotWidth / points.length - 8));
  return <div className="rounded-xl border border-border-main/70 bg-surface p-3"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><LineChart className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-text-main">Visualization</h3></div><p className="mt-1 text-xs text-text-muted">Bar chart of {column} · first {points.length} rows</p></div><span className="rounded-full bg-cream-highlight px-2 py-1 text-[10px] font-semibold text-accent">Preview</span></div><div className="mt-3 overflow-x-auto"><svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`Bar chart for ${column}`} className="h-auto min-w-[480px] w-full"><line x1={leftPadding} y1={plotHeight} x2={chartWidth - 12} y2={plotHeight} stroke="currentColor" className="text-border-main" />{points.map((point, index) => { const x = leftPadding + (index + 0.5) * (plotWidth / points.length) - barWidth / 2; const height = (point.value / maxValue) * (plotHeight - 8); const y = plotHeight - height; return <g key={`${point.label}-${index}`}><title>{`${point.label}: ${formatNumber(point.value)}`}</title><rect x={x} y={y} width={barWidth} height={height} rx="4" className="fill-accent/80" /><text x={x + barWidth / 2} y={Math.max(12, y - 5)} textAnchor="middle" className="fill-text-muted text-[9px]">{formatNumber(point.value)}</text><text x={x + barWidth / 2} y={plotHeight + 18} textAnchor="middle" className="fill-text-muted text-[9px]">{truncate(point.label)}</text></g>; })}</svg></div><div className="mt-2 flex items-center justify-between text-[10px] text-text-muted"><span>Max: {formatNumber(maxValue)}</span><span>{table.rowCount} total rows available</span></div></div>;
}

function formatNumber(value: number): string { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value); }
function truncate(value: string): string { return value.length > 10 ? `${value.slice(0, 9)}…` : value; }
