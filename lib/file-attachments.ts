import { FileUIPart } from "ai";

export async function fileToUIPart(file: File): Promise<FileUIPart> {
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error || new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
  return { type: "file", mediaType: file.type || "application/octet-stream", filename: file.name, url };
}
