"use client";

import { BarChart3, Download, LineChart, MousePointer2, Table2 } from "lucide-react";
import { useState } from "react";
import { CsvTableSummary, SheetTableSummary } from "@/lib/agent/tools/file-analysis";

type ChartType = "bar" | "line";

export function VisualizationPanel({ table, sheetTables }: { table: CsvTableSummary | undefined; sheetTables?: SheetTableSummary[] }) {
  const [selectedSheet, setSelectedSheet] = useState(sheetTables?.[0]?.name || "");
  const [selectedColumn, setSelectedColumn] = useState("");
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const activeSheet = sheetTables?.find((sheet) => sheet.name === selectedSheet);
  const selectedTable = activeSheet?.table || table;
  const numericColumns = selectedTable?.numericStats.map((stat) => stat.column) || [];
  const activeColumn = numericColumns.includes(selectedColumn) ? selectedColumn : numericColumns[0];
  const points = buildPoints(selectedTable, activeColumn);

  if (!selectedTable || !activeColumn || points.length === 0) return <div className="rounded-xl border border-dashed border-border-main bg-surface/60 p-5 text-center"><BarChart3 className="mx-auto h-5 w-5 text-accent" /><p className="mt-2 text-sm font-semibold text-text-main">No chartable numeric data</p><p className="mt-1 text-xs leading-5 text-text-muted">Add a worksheet with at least one numeric column to generate an interactive chart.</p></div>;

  const hovered = hoveredIndex === null ? null : points[hoveredIndex];
  const maxValue = Math.max(...points.map((point) => point.value), 1);
  const chartWidth = 600;
  const chartHeight = 250;
  const leftPadding = 46;
  const bottomPadding = 48;
  const plotWidth = chartWidth - leftPadding - 14;
  const plotHeight = chartHeight - bottomPadding - 14;
  const barWidth = Math.max(12, Math.min(38, plotWidth / points.length - 10));
  const linePoints = points.map((point, index) => `${leftPadding + (index + 0.5) * (plotWidth / points.length)},${plotHeight - (point.value / maxValue) * (plotHeight - 12)}`).join(" ");

  return <div className="rounded-xl border border-border-main/70 bg-surface p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><div className="flex items-center gap-2"><LineChart className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-text-main">Interactive visualization</h3></div><p className="mt-1 text-xs text-text-muted">Hover a point or bar for details.</p></div><div className="flex items-center gap-1"><button type="button" onClick={() => downloadRenderedChart(chartType, activeColumn)} className="flex items-center gap-1 rounded-md border border-border-main/70 px-2 py-1.5 text-[10px] font-semibold text-text-main hover:bg-black/5"><Download className="h-3 w-3" />SVG</button><button type="button" onClick={() => downloadChartCsv(activeColumn, points)} className="flex items-center gap-1 rounded-md border border-border-main/70 px-2 py-1.5 text-[10px] font-semibold text-text-main hover:bg-black/5"><Table2 className="h-3 w-3" />Data</button></div></div><div className="mt-3 grid gap-2 sm:grid-cols-3"><label className="text-[10px] font-semibold text-text-muted">Worksheet<select value={selectedSheet} onChange={(event) => setSelectedSheet(event.target.value)} disabled={!sheetTables || sheetTables.length < 2} className="mt-1 block w-full rounded-md border border-border-main/70 bg-surface px-2 py-1.5 text-xs font-medium text-text-main disabled:opacity-60">{(sheetTables && sheetTables.length > 0 ? sheetTables : [{ name: "Current sheet", table: selectedTable!, preview: "" }]).map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}</select></label><label className="text-[10px] font-semibold text-text-muted">Numeric column<select value={activeColumn} onChange={(event) => setSelectedColumn(event.target.value)} className="mt-1 block w-full rounded-md border border-border-main/70 bg-surface px-2 py-1.5 text-xs font-medium text-text-main">{numericColumns.map((column) => <option key={column} value={column}>{column}</option>)}</select></label><label className="text-[10px] font-semibold text-text-muted">Chart type<select value={chartType} onChange={(event) => setChartType(event.target.value as ChartType)} className="mt-1 block w-full rounded-md border border-border-main/70 bg-surface px-2 py-1.5 text-xs font-medium text-text-main"><option value="bar">Bar chart</option><option value="line">Line chart</option></select></label></div><div className="mt-3 overflow-x-auto"><svg id="susan-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${chartType} chart for ${activeColumn}`} className="h-auto min-w-[500px] w-full"><line x1={leftPadding} y1={plotHeight} x2={chartWidth - 14} y2={plotHeight} stroke="currentColor" className="text-border-main" />{chartType === "line" && <polyline points={linePoints} fill="none" stroke="currentColor" strokeWidth="3" className="text-accent" />}{points.map((point, index) => { const x = leftPadding + (index + 0.5) * (plotWidth / points.length); const height = (point.value / maxValue) * (plotHeight - 12); const y = plotHeight - height; return <g key={`${point.label}-${index}`} onMouseEnter={() => setHoveredIndex(index)} onMouseLeave={() => setHoveredIndex(null)} className="cursor-pointer">{chartType === "bar" ? <rect x={x - barWidth / 2} y={y} width={barWidth} height={height} rx="4" className={`${hoveredIndex === index ? "fill-accent" : "fill-accent/75"}`} /> : <circle cx={x} cy={y} r={hoveredIndex === index ? 6 : 4} className="fill-accent" />}<title>{`${point.label}: ${formatNumber(point.value)}`}</title><text x={x} y={plotHeight + 19} textAnchor="middle" className="fill-text-muted text-[9px]">{truncate(point.label)}</text></g>; })}</svg></div><div className="mt-2 flex min-h-8 items-center justify-between gap-3 text-[10px] text-text-muted"><span>Max: {formatNumber(maxValue)} · {points.length} preview points</span>{hovered ? <span className="flex items-center gap-1 rounded-full bg-cream-highlight px-2 py-1 font-semibold text-accent"><MousePointer2 className="h-3 w-3" />{hovered.label}: {formatNumber(hovered.value)}</span> : <span>Hover chart data</span>}</div></div>;
}

function buildPoints(table: CsvTableSummary | undefined, column: string | undefined): Array<{ label: string; value: number }> {
  if (!table || !column) return [];
  const columnIndex = table.columns.indexOf(column);
  if (columnIndex < 0) return [];
  const labelIndex = table.columns.findIndex((_, index) => index !== columnIndex);
  return table.rows.flatMap((row, index) => { const value = Number(row[columnIndex]); return Number.isFinite(value) ? [{ label: row[labelIndex]?.trim() || `Row ${index + 1}`, value }] : []; });
}
function downloadRenderedChart(chartType: ChartType, column: string): void { const source = document.getElementById("susan-chart"); if (!source) return; const clone = source.cloneNode(true) as SVGElement; clone.setAttribute("xmlns", "http://www.w3.org/2000/svg"); const svg = new XMLSerializer().serializeToString(clone); downloadBlob(new Blob([svg], { type: "image/svg+xml" }), `${safeName(column)}-${chartType}.svg`); }
function downloadChartCsv(column: string, points: Array<{ label: string; value: number }>): void { const csv = ["Label,Value", ...points.map((point) => `${JSON.stringify(point.label)},${point.value}`)].join("\n"); downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${safeName(column)}-chart-data.csv`); }
function downloadBlob(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeName(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart"; }
function formatNumber(value: number): string { return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value); }
function truncate(value: string): string { return value.length > 10 ? `${value.slice(0, 9)}…` : value; }
