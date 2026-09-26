import { ToolDefinition } from "@/lib/agent/types";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth";
import ExcelJS from "exceljs";

interface FileAnalysisInput { filename: string; mediaType: string; dataUrl: string; }
export interface NumericColumnSummary { column: string; count: number; average: number; minimum: number; maximum: number; }
export interface ChartPoint { label: string; value: number; }
export interface CsvTableSummary { columns: string[]; rows: string[][]; rowCount: number; missingValueCount: number; numericStats: NumericColumnSummary[]; chartData?: { column: string; points: ChartPoint[] }; }
export interface SheetTableSummary { name: string; table: CsvTableSummary; preview: string; }
export interface FileAnalysisOutput { filename: string; mediaType: string; sizeBytes: number; characterCount?: number; lineCount?: number; pageCount?: number; paragraphCount?: number; tableCount?: number; sheetCount?: number; sheetNames?: string[]; sheetTables?: SheetTableSummary[]; jsonValid?: boolean; preview?: string; note?: string; table?: CsvTableSummary; }

const MAX_DATA_URL_LENGTH = 16_000_000;
const MAX_PREVIEW_LENGTH = 12_000;
const MAX_PDF_PAGES = 50;
const MAX_XLSX_SHEETS = 20;
const MAX_XLSX_ROWS_PER_SHEET = 500;
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
const DOCUMENT_TYPES = new Map([
  ["application/pdf", "PDF"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX"],
]);

export const fileAnalysisTool: ToolDefinition<FileAnalysisInput, FileAnalysisOutput> = {
  id: "file-analysis",
  name: "File Analysis",
  description: "Inspect text files, extract bounded PDF/DOCX text and tables, and analyze XLSX sheets with a preview table.",
  permission: "read-only",
  inputSchema: { type: "object", properties: { filename: { type: "string", maxLength: 255 }, mediaType: { type: "string", maxLength: 100 }, dataUrl: { type: "string", maxLength: MAX_DATA_URL_LENGTH } }, required: ["filename", "mediaType", "dataUrl"], additionalProperties: false },
  async execute(input, context) {
    if (context.signal.aborted) throw new Error("File analysis was cancelled.");
    validateInput(input);
    if (input.mediaType === "application/pdf") return analyzePdf(input, context.signal);
    if (input.mediaType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return analyzeDocx(input, context.signal);
    if (input.mediaType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return analyzeXlsx(input, context.signal);
    if (!TEXT_TYPES.has(input.mediaType)) {
      const documentType = DOCUMENT_TYPES.get(input.mediaType);
      return { filename: input.filename, mediaType: input.mediaType, sizeBytes: estimateDataSize(input.dataUrl), note: documentType ? `${documentType} file detected, but no extraction adapter is registered for this media type.` : "This read-only analyzer supports TXT, Markdown, CSV, JSON, PDF, DOCX, and XLSX." };
    }

    const text = decodeDataUrl(input.dataUrl);
    const output: FileAnalysisOutput = { filename: input.filename, mediaType: input.mediaType, sizeBytes: new TextEncoder().encode(text).byteLength, characterCount: text.length, lineCount: text.length === 0 ? 0 : text.split(/\r?\n/).length, preview: text.slice(0, MAX_PREVIEW_LENGTH) };
    if (input.mediaType === "text/csv") output.table = parseCsv(text);
    if (input.mediaType === "application/json") {
      try { JSON.parse(text); output.jsonValid = true; } catch { output.jsonValid = false; output.note = "The file could not be parsed as valid JSON."; }
    }
    return output;
  },
};

async function analyzePdf(input: FileAnalysisInput, signal: AbortSignal): Promise<FileAnalysisOutput> {
  const bytes = decodeDataUrlBytes(input.dataUrl);
  const document = await pdfjsLib.getDocument({ data: bytes }).promise;
  const pageCount = document.numPages;
  const pagesToRead = Math.min(pageCount, MAX_PDF_PAGES);
  const pageText: string[] = [];
  for (let pageNumber = 1; pageNumber <= pagesToRead; pageNumber += 1) {
    if (signal.aborted) throw new Error("File analysis was cancelled.");
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items.map((item) => "str" in item ? item.str : "").join(" ").trim();
    if (text) pageText.push(`Page ${pageNumber}\n${text}`);
  }
  const extractedText = pageText.join("\n\n");
  return { filename: input.filename, mediaType: input.mediaType, sizeBytes: bytes.byteLength, pageCount, characterCount: extractedText.length, lineCount: extractedText.length === 0 ? 0 : extractedText.split(/\r?\n/).length, preview: extractedText.slice(0, MAX_PREVIEW_LENGTH), note: pageCount > MAX_PDF_PAGES ? `Extracted the first ${MAX_PDF_PAGES} of ${pageCount} pages to keep analysis bounded.` : extractedText ? "PDF text extracted successfully." : "This PDF has no readable text layer; OCR is required for scanned pages." };
}

async function analyzeDocx(input: FileAnalysisInput, signal: AbortSignal): Promise<FileAnalysisOutput> {
  if (signal.aborted) throw new Error("File analysis was cancelled.");
  const arrayBuffer = toArrayBuffer(decodeDataUrlBytes(input.dataUrl));
  const rawText = (await mammoth.extractRawText({ arrayBuffer })).value.trim();
  if (signal.aborted) throw new Error("File analysis was cancelled.");
  const html = (await mammoth.convertToHtml({ arrayBuffer })).value;
  const paragraphCount = rawText ? rawText.split(/\r?\n/).filter(Boolean).length : 0;
  const tableRecords = parseDocxTable(html);
  const tableCount = (html.match(/<table\b/gi) || []).length;
  const table = tableRecords ? summarizeTable(tableRecords) : undefined;
  return { filename: input.filename, mediaType: input.mediaType, sizeBytes: arrayBuffer.byteLength, characterCount: rawText.length, lineCount: rawText ? rawText.split(/\r?\n/).length : 0, paragraphCount, tableCount, table, preview: rawText.slice(0, MAX_PREVIEW_LENGTH), note: rawText ? `DOCX text extracted successfully${tableCount ? `; extracted the first of ${tableCount} table${tableCount === 1 ? "" : "s"} with ${table?.rowCount || 0} data row${table?.rowCount === 1 ? "" : "s"}.` : "."}` : tableCount ? `DOCX table extracted${tableCount > 1 ? `; ${tableCount - 1} additional tables detected.` : "."}` : "This DOCX does not contain readable paragraph text." };
}

function parseDocxTable(html: string): string[][] | undefined {
  const firstTable = html.match(/<table\b[^>]*>[\s\S]*?<\/table>/i)?.[0];
  if (!firstTable) return undefined;
  const rows = [...firstTable.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => [...match[1].matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((cell) => decodeHtml(cell[1]))).filter((row) => row.length > 0);
  return rows.length > 0 ? rows : undefined;
}

function decodeHtml(value: string): string {
  const text = value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (typeof DOMParser === "undefined") return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  const document = new DOMParser().parseFromString(text, "text/html");
  return document.documentElement.textContent || "";
}

async function analyzeXlsx(input: FileAnalysisInput, signal: AbortSignal): Promise<FileAnalysisOutput> {
  if (signal.aborted) throw new Error("File analysis was cancelled.");
  const bytes = decodeDataUrlBytes(input.dataUrl);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(toArrayBuffer(bytes));
  const sheetNames = workbook.worksheets.map((sheet) => sheet.name);
  const firstSheet = sheetNames[0];
  const sheetTables = workbook.worksheets.slice(0, MAX_XLSX_SHEETS).map((sheet) => {
    const matrix: string[][] = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      if (matrix.length >= MAX_XLSX_ROWS_PER_SHEET + 1) return;
      const values = Array.isArray(row.values) ? row.values.slice(1) : [];
      matrix.push(values.map((value) => value instanceof Date ? value.toISOString() : String(value ?? "")));
    });
    const table = summarizeTable(matrix);
    return { name: sheet.name, table, preview: matrix.slice(0, 9).map((row) => row.join(" | ")).join("\n") };
  });
  if (signal.aborted) throw new Error("File analysis was cancelled.");
  const firstTable = sheetTables[0];
  const preview = firstTable?.preview || "";
  return { filename: input.filename, mediaType: input.mediaType, sizeBytes: bytes.byteLength, sheetCount: sheetNames.length, sheetNames, sheetTables, characterCount: preview.length, lineCount: preview ? preview.split(/\r?\n/).length : 0, preview, table: firstTable?.table, note: firstSheet ? `XLSX extracted ${Math.min(sheetNames.length, MAX_XLSX_SHEETS)} of ${sheetNames.length} sheets. Select a sheet to inspect its preview.${sheetNames.length > MAX_XLSX_SHEETS ? ` ${sheetNames.length - MAX_XLSX_SHEETS} additional sheets were skipped to keep analysis bounded.` : ""}` : "This XLSX workbook has no sheets." };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function validateInput(input: FileAnalysisInput): void { if (!input || typeof input.filename !== "string" || input.filename.length === 0 || input.filename.length > 255) throw new Error("A valid filename is required."); if (typeof input.mediaType !== "string" || input.mediaType.length > 100) throw new Error("A valid media type is required."); if (typeof input.dataUrl !== "string" || input.dataUrl.length === 0 || input.dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error("The file data is missing or too large."); if (!input.dataUrl.startsWith("data:")) throw new Error("File analysis accepts data URLs only."); }
function decodeDataUrl(dataUrl: string): string { return new TextDecoder().decode(decodeDataUrlBytes(dataUrl)); }
function decodeDataUrlBytes(dataUrl: string): Uint8Array { const commaIndex = dataUrl.indexOf(","); if (commaIndex < 0) throw new Error("The file data URL is malformed."); const metadata = dataUrl.slice(0, commaIndex); const payload = dataUrl.slice(commaIndex + 1); if (metadata.endsWith(";base64")) { const binary = atob(payload); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); } return new TextEncoder().encode(decodeURIComponent(payload)); }
function estimateDataSize(dataUrl: string): number { return decodeDataUrlBytes(dataUrl).byteLength; }

function parseCsv(text: string): CsvTableSummary {
  return summarizeTable(parseCsvRecords(text));
}

function summarizeTable(inputRecords: string[][]): CsvTableSummary {
  const records = inputRecords.filter((record) => record.some((cell) => cell.trim() !== ""));
  const columns = (records.shift() || []).map((column, index) => column.trim() || `Column ${index + 1}`);
  const rows = records.slice(0, 8).map((record) => columns.map((_, index) => record[index]?.trim() || ""));
  const missingValueCount = records.reduce((count, record) => count + columns.filter((_, index) => !record[index]?.trim()).length, 0);
  const numericStats = columns.flatMap((column, columnIndex) => {
    const values = records.map((record) => Number(record[columnIndex])).filter((value) => Number.isFinite(value));
    const nonEmptyCount = records.filter((record) => record[columnIndex]?.trim()).length;
    if (values.length === 0 || values.length < Math.max(1, Math.ceil(nonEmptyCount * 0.8))) return [];
    const total = values.reduce((sum, value) => sum + value, 0);
    return [{ column, count: values.length, average: total / values.length, minimum: Math.min(...values), maximum: Math.max(...values) }];
  });
  const chartColumn = numericStats[0]?.column;
  const chartColumnIndex = chartColumn ? columns.indexOf(chartColumn) : -1;
  const labelColumnIndex = columns.findIndex((_, index) => index !== chartColumnIndex);
  const chartData = chartColumn && chartColumnIndex >= 0 ? { column: chartColumn, points: records.slice(0, 12).flatMap((record, index) => { const value = Number(record[chartColumnIndex]); return Number.isFinite(value) ? [{ label: record[labelColumnIndex]?.trim() || `Row ${index + 1}`, value }] : []; }) } : undefined;
  return { columns, rows, rowCount: records.length, missingValueCount, numericStats, chartData };
}

function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    const next = text[index + 1];
    if (character === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (character === '"') { quoted = !quoted; continue; }
    if (character === "," && !quoted) { record.push(cell); cell = ""; continue; }
    if ((character === "\n" || character === "\r") && !quoted) { if (character === "\r" && next === "\n") index += 1; record.push(cell); records.push(record); record = []; cell = ""; continue; }
    cell += character;
  }
  if (cell || record.length > 0) { record.push(cell); records.push(record); }
  return records;
}
