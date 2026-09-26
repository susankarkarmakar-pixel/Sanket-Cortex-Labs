"use client";

import { CsvTableSummary } from "@/lib/agent/tools/file-analysis";

export function DataPreviewTable({ table }: { table: CsvTableSummary }) {
  return <div className="mt-3 overflow-hidden rounded-lg border border-border-main/70 bg-surface"><div className="flex items-center justify-between gap-3 border-b border-border-main/70 px-3 py-2"><p className="text-xs font-semibold text-text-main">Data preview</p><p className="text-[10px] text-text-muted">{table.rowCount} rows · {table.columns.length} columns · {table.missingValueCount} missing</p></div><div className="overflow-x-auto"><table className="min-w-full text-left text-[11px]"><thead className="bg-black/5 text-text-muted"><tr>{table.columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-semibold">{column}</th>)}</tr></thead><tbody>{table.rows.map((row, rowIndex) => <tr key={`row-${rowIndex}`} className="border-t border-border-main/50 text-text-main">{table.columns.map((column, columnIndex) => <td key={`${column}-${columnIndex}`} className="max-w-[180px] truncate px-3 py-2">{row[columnIndex] || <span className="text-text-muted/60">—</span>}</td>)}</tr>)}</tbody></table></div>{table.rowCount > table.rows.length && <p className="border-t border-border-main/70 px-3 py-2 text-[10px] text-text-muted">Showing first {table.rows.length} rows.</p>}</div>;
}
