"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_FILES = 3;
const MAX_TOTAL_FILE_SIZE = 12 * 1024 * 1024;
const ACCEPTED_FILES = "image/*,.pdf,.txt,.md,.csv,.json";
const ACCEPTED_MIME_TYPES = new Set(["application/pdf", "text/plain", "text/markdown", "text/csv", "application/json"]);

interface MessageInputProps {
  input: string;
  onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>, files: File[]) => void;
  isLoading: boolean;
  stop: () => void;
}

export function MessageInput({ input, onInputChange, onSubmit, isLoading, stop }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  const addFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const nextFiles = [...files];
    let error: string | null = null;
    for (const file of Array.from(selectedFiles)) {
      if (nextFiles.length >= MAX_FILES) {
        error = `You can attach up to ${MAX_FILES} files.`;
        break;
      }
      if (file.size > MAX_FILE_SIZE) {
        error = `${file.name} is larger than 4 MB.`;
        continue;
      }
      if (!isAcceptedFile(file)) {
        error = `${file.name} has an unsupported file type.`;
        continue;
      }
      const totalSize = nextFiles.reduce((sum, existing) => sum + existing.size, 0) + file.size;
      if (totalSize > MAX_TOTAL_FILE_SIZE) {
        error = "Attachments must be 12 MB or smaller in total.";
        break;
      }
      if (!nextFiles.some((existing) => existing.name === file.name && existing.size === file.size)) nextFiles.push(file);
    }
    setFiles(nextFiles);
    setFileError(error);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if ((input.trim() || files.length > 0) && !isLoading) formRef.current?.requestSubmit();
    }
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    onSubmit(event, files);
    setFiles([]);
    setFileError(null);
  };

  const removeFile = (index: number) => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  const isEmpty = input.trim().length === 0 && files.length === 0;

  return (
    <div className="relative z-10 w-full bg-bg-main p-4">
      <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-3xl rounded-2xl border border-border-main/50 bg-surface p-2 shadow-sm transition-all focus-within:border-border-main focus-within:ring-1 focus-within:ring-border-main/50">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-2 pb-2" aria-label="Selected attachments">
            {files.map((file, index) => (
              <div key={`${file.name}-${file.size}`} className="flex max-w-full items-center gap-1.5 rounded-lg bg-black/5 px-2 py-1 text-xs text-text-main">
                <span className="max-w-[180px] truncate">{file.name}</span>
                <button type="button" onClick={() => removeFile(index)} aria-label={`Remove ${file.name}`} className="rounded p-0.5 text-text-muted hover:bg-black/10 hover:text-text-main">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <input ref={fileInputRef} type="file" multiple accept={ACCEPTED_FILES} className="sr-only" onChange={(event) => addFiles(event.target.files)} />
          <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach files" title="Attach files" className="mb-1 flex shrink-0 items-center justify-center rounded-xl p-2.5 text-text-muted transition-colors hover:bg-black/5 hover:text-text-main">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea ref={textareaRef} value={input} onChange={onInputChange} onKeyDown={handleKeyDown} aria-label="Message Susan AI" placeholder="How can I help you today?" className="min-h-[48px] max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-3 font-sans text-text-main outline-none placeholder:text-text-muted/60" rows={1} />
          {isLoading ? (
            <button type="button" onClick={stop} aria-label="Stop generating response" className="mb-1 flex shrink-0 items-center justify-center rounded-xl bg-text-main p-2.5 text-surface transition-colors hover:opacity-80">
              <Square className="h-4 w-4 fill-current" />
            </button>
          ) : (
            <button type="submit" disabled={isEmpty} aria-label="Send message" className={cn("mb-1 flex shrink-0 items-center justify-center rounded-xl p-2.5 transition-colors", isEmpty ? "cursor-not-allowed bg-black/5 text-text-muted/40" : "bg-accent text-white shadow-sm hover:opacity-90")}>
              <ArrowUp className="h-4 w-4" />
            </button>
          )}
        </div>
      </form>
      {fileError && <p role="alert" className="mx-auto mt-2 max-w-3xl text-center text-xs text-red-600">{fileError}</p>}
      <div className="mt-3 text-center text-xs text-text-muted/70">Attach up to 3 images, PDF, text, CSV, or JSON files (4 MB each, 12 MB total).</div>
      <div className="mt-1 text-center text-xs text-text-muted/70">Susan AI may produce inaccurate information about people, places, or facts.</div>
    </div>
  );
}

function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true;
  return /\.(pdf|txt|md|csv|json)$/i.test(file.name);
}
