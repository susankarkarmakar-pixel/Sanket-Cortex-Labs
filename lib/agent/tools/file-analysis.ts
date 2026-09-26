import { ToolDefinition } from "@/lib/agent/types";

interface FileAnalysisInput {
  filename: string;
  mediaType: string;
  dataUrl: string;
}

interface FileAnalysisOutput {
  filename: string;
  mediaType: string;
  sizeBytes: number;
  characterCount?: number;
  lineCount?: number;
  jsonValid?: boolean;
  preview?: string;
  note?: string;
}

const MAX_DATA_URL_LENGTH = 16_000_000;
const MAX_PREVIEW_LENGTH = 12_000;
const TEXT_TYPES = new Set(["text/plain", "text/markdown", "text/csv", "application/json"]);

export const fileAnalysisTool: ToolDefinition<FileAnalysisInput, FileAnalysisOutput> = {
  id: "file-analysis",
  name: "File Analysis",
  description: "Inspect an attached text, Markdown, CSV, or JSON file and return safe metadata and a bounded preview.",
  permission: "read-only",
  inputSchema: {
    type: "object",
    properties: {
      filename: { type: "string", maxLength: 255 },
      mediaType: { type: "string", maxLength: 100 },
      dataUrl: { type: "string", maxLength: MAX_DATA_URL_LENGTH },
    },
    required: ["filename", "mediaType", "dataUrl"],
    additionalProperties: false,
  },
  async execute(input, context) {
    if (context.signal.aborted) throw new Error("File analysis was cancelled.");
    validateInput(input);
    if (!TEXT_TYPES.has(input.mediaType)) {
      return {
        filename: input.filename,
        mediaType: input.mediaType,
        sizeBytes: estimateDataSize(input.dataUrl),
        note: "This read-only analyzer currently supports TXT, Markdown, CSV, and JSON files.",
      };
    }

    const text = decodeDataUrl(input.dataUrl);
    const output: FileAnalysisOutput = {
      filename: input.filename,
      mediaType: input.mediaType,
      sizeBytes: new TextEncoder().encode(text).byteLength,
      characterCount: text.length,
      lineCount: text.length === 0 ? 0 : text.split(/\r?\n/).length,
      preview: text.slice(0, MAX_PREVIEW_LENGTH),
    };

    if (input.mediaType === "application/json") {
      try {
        JSON.parse(text);
        output.jsonValid = true;
      } catch {
        output.jsonValid = false;
        output.note = "The file could not be parsed as valid JSON.";
      }
    }
    return output;
  },
};

function validateInput(input: FileAnalysisInput): void {
  if (!input || typeof input.filename !== "string" || input.filename.length === 0 || input.filename.length > 255) throw new Error("A valid filename is required.");
  if (typeof input.mediaType !== "string" || input.mediaType.length > 100) throw new Error("A valid media type is required.");
  if (typeof input.dataUrl !== "string" || input.dataUrl.length === 0 || input.dataUrl.length > MAX_DATA_URL_LENGTH) throw new Error("The file data is missing or too large.");
  if (!input.dataUrl.startsWith("data:")) throw new Error("File analysis accepts data URLs only.");
}

function decodeDataUrl(dataUrl: string): string {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) throw new Error("The file data URL is malformed.");
  const metadata = dataUrl.slice(0, commaIndex);
  const payload = dataUrl.slice(commaIndex + 1);
  if (metadata.endsWith(";base64")) {
    const binary = atob(payload);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  return decodeURIComponent(payload);
}

function estimateDataSize(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) return 0;
  const payload = dataUrl.slice(commaIndex + 1);
  return dataUrl.slice(0, commaIndex).endsWith(";base64") ? Math.floor(payload.length * 0.75) : new TextEncoder().encode(decodeURIComponent(payload)).byteLength;
}
