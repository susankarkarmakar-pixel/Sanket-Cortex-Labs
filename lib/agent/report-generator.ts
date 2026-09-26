import ExcelJS from "exceljs";
import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { jsPDF } from "jspdf";
import { CsvTableSummary } from "@/lib/agent/tools/file-analysis";

export type ReportFormat = "pdf" | "docx" | "xlsx";
export interface ReportData { title: string; goal: string; sourceFilename: string; generatedAt: string; summary: string; table?: CsvTableSummary; }

export async function downloadReport(format: ReportFormat, data: ReportData): Promise<void> {
  if (format === "pdf") return downloadPdf(data);
  if (format === "docx") return downloadDocx(data);
  return downloadXlsx(data);
}

function downloadPdf(data: ReportData): void {
  const pdf = new jsPDF();
  const margin = 18;
  const maxWidth = 174;
  let y = 22;
  pdf.setFontSize(18);
  pdf.text(data.title, margin, y);
  y += 10;
  pdf.setFontSize(9);
  pdf.setTextColor(90, 90, 90);
  pdf.text(`Source: ${data.sourceFilename}`, margin, y);
  y += 5;
  pdf.text(`Generated: ${data.generatedAt}`, margin, y);
  y += 10;
  pdf.setTextColor(30, 30, 30);
  pdf.setFontSize(11);
  pdf.text("Task", margin, y);
  y += 6;
  y = writePdfLines(pdf, data.goal, margin, y, maxWidth);
  y += 5;
  pdf.text("Analysis summary", margin, y);
  y += 6;
  y = writePdfLines(pdf, data.summary, margin, y, maxWidth);
  if (data.table) {
    y += 5;
    pdf.text(`Data preview (${data.table.rowCount} rows, ${data.table.columns.length} columns)`, margin, y);
    y += 6;
    const header = data.table.columns.join(" | ");
    y = writePdfLines(pdf, header, margin, y, maxWidth);
    for (const row of data.table.rows) {
      y = writePdfLines(pdf, row.join(" | "), margin, y, maxWidth);
      if (y > 275) { pdf.addPage(); y = 22; }
    }
  }
  pdf.save(`${safeBaseName(data.title)}.pdf`);
}

async function downloadDocx(data: ReportData): Promise<void> {
  const children: Array<Paragraph | Table> = [
    new Paragraph({ text: data.title, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `Source: ${data.sourceFilename}`, italics: true })] }),
    new Paragraph({ text: `Generated: ${data.generatedAt}` }),
    new Paragraph({ text: "Task", heading: HeadingLevel.HEADING_1 }),
    new Paragraph(data.goal),
    new Paragraph({ text: "Analysis summary", heading: HeadingLevel.HEADING_1 }),
    ...data.summary.split(/\r?\n/).map((line) => new Paragraph(line)),
  ];
  if (data.table) {
    children.push(new Paragraph({ text: "Data preview", heading: HeadingLevel.HEADING_1 }));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: data.table.columns.map((column) => new TableCell({ children: [new Paragraph({ text: column })] })) }), ...data.table.rows.map((row) => new TableRow({ children: data.table!.columns.map((_, index) => new TableCell({ children: [new Paragraph({ text: row[index] || "" })] })) }))] }));
  }
  const blob = await Packer.toBlob(new Document({ sections: [{ children }] }));
  downloadBlob(blob, `${safeBaseName(data.title)}.docx`);
}

async function downloadXlsx(data: ReportData): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet("Report");
  summary.addRow([data.title]);
  summary.addRow(["Source", data.sourceFilename]);
  summary.addRow(["Generated", data.generatedAt]);
  summary.addRow([]);
  summary.addRow(["Task", data.goal]);
  summary.addRow([]);
  summary.addRow(["Analysis summary"]);
  data.summary.split(/\r?\n/).forEach((line) => summary.addRow([line]));
  summary.getColumn(1).width = 28;
  summary.getColumn(2).width = 80;
  if (data.table) {
    const sheet = workbook.addWorksheet("Data Preview");
    sheet.addRow(data.table.columns);
    data.table.rows.forEach((row) => sheet.addRow(row));
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF6B4226" } };
    data.table.columns.forEach((_, index) => { sheet.getColumn(index + 1).width = 20; });
  }
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(new Blob([buffer as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeBaseName(data.title)}.xlsx`);
}

function writePdfLines(pdf: jsPDF, text: string, x: number, y: number, width: number): number {
  const lines = pdf.splitTextToSize(text || "—", width) as string[];
  for (const line of lines) { if (y > 278) { pdf.addPage(); y = 22; } pdf.text(line, x, y); y += 5; }
  return y;
}

function downloadBlob(blob: Blob, filename: string): void { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeBaseName(title: string): string { return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "susan-ai-report"; }
