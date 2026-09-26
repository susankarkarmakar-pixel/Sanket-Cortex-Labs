import { ToolDefinition } from "@/lib/agent/types";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

interface FileAnalysisInput { filename: string; mediaType: string; dataUrl: string; }
export interface NumericColumnSummary { column: string; count: number; average: number; minimum: number; maximum: number; }
export interface CsvTableSummary { columns: string[]; rows: string[][]; rowCount: number; missingValueCount: number; numericStats: NumericColumnSummary[]; }
export interface FileAnalysisOutput { filename: string; mediaType: string; sizeBytes: number; characterCount?: number; lineCount?: number; pageCount?: number; jsonValid?: boolean; preview?: string; note?: string; table?: CsvTableSummary; }

const MAX_DATA_URL_LENGTH = 16_000_000;
const MAX_PREVIEW_LENGTH = 12_000;
const MAX_PDF_PAGES = 50;
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);
const DOCUMENT_TYPES = new Map([
  ["application/pdf", "PDF"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "DOCX"],
  ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "XLSX"],
]);

export const fileAnalysisTool: ToolDefinition<FileAnalysisInput, FileAnalysisOutput> = {
  id: "file-analysis",
  name: "File Analysis",
  description: "Inspect text files, extract bounded PDF text, and identify DOCX/XLSX attachments with safe metadata.",
  permission: "read-only",
  inputSchema: { type: "object", properties: { filename: { type: "string", maxLength: 255 }, mediaType: { type: "string", maxLength: 100 }, dataUrl: { type: "string", maxLength: MAX_DATA_URL_LENGTH } }, required: ["filename", "mediaType", "dataUrl"], additionalProperties: false },
  async execute(input, context) {
    if (context.signal.aborted) throw new Error("File analysis was cancelled.");
    validateInput(input);
    if (input.mediaType === "application/pdf") return analyzePdf(input, context.signal);
    if (!TEXT_TYPES.has(input.mediaType)) {
      const documentType = DOCUMENT_TYPES.get(input.mediaType);
      return { filename: input.filename, mediaType: input.mediaType, sizeBytes: estimateDataSize(input.dataUrl), note: documentType ? `${documentType} file detected. Binary text/table extraction will be connected in the next document-analysis phase.` : "This read-only analyzer supports TXT, Markdown, CSV, JSON, PDF, DOCX, and XLSX metadata." };
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

function validateInput(input: FileAnalysisInput): void { if (!input || typeof input.filename !== "string" || input.filename.length === 0 || input.filename.length > 255) throw new Error("A valid filename is required."); if (typeof input.mediaType !== "string" || input.mediaType.length > 100) throw new Error("A valid media type is required."); if (typeof input.dataUrl !== "string" || input.dataUrl.length === 0 || input.dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error("The file data is missing or too large."); if (!input.dataUrl.startsWith("data:")) throw new Error("File analysis accepts data URLs only."); }
function decodeDataUrl(dataUrl: string): string { return new TextDecoder().decode(decodeDataUrlBytes(dataUrl)); }
function decodeDataUrlBytes(dataUrl: string): Uint8Array { const commaIndex = dataUrl.indexOf(","); if (commaIndex < 0) throw new Error("The file data URL is malformed."); const metadata = dataUrl.slice(0, commaIndex); const payload = dataUrl.slice(commaIndex + 1); if (metadata.endsWith(";base64")) { const binary = atob(payload); return Uint8Array.from(binary, (character) => character.charCodeAt(0)); } return new TextEncoder().encode(decodeURIComponent(payload)); }
function estimateDataSize(dataUrl: string): number { return decodeDataUrlBytes(dataUrl).byteLength; }

function parseCsv(text: string): CsvTableSummary {
  const records = parseCsvRecords(text).filter((record) => record.some((cell) => cell.trim() !== ""));
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
  return { columns, rows, rowCount: records.length, missingValueCount, numericStats };
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
