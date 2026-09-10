import { readFileSync } from "node:fs";
import { extname } from "node:path";

// pdf-parse is a CommonJS module; the default import is the parse function
import pdfParse from "pdf-parse";

export interface IngestResult {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
  method: "native" | "vision";
}

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png"]);
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

// Minimum characters of extracted text before we trust the native layer.
const MIN_TEXT_LENGTH = 50;

export async function detectAndExtract(filePath: string): Promise<IngestResult> {
  const ext = extname(filePath).toLowerCase();

  if (IMAGE_EXTS.has(ext)) {
    return buildVisionResult(filePath, ext);
  }

  if (ext === ".pdf") {
    const buffer = readFileSync(filePath);
    const parsed = await pdfParse(buffer);
    const text = parsed.text.trim();

    if (text.length > MIN_TEXT_LENGTH) {
      return { text, method: "native" };
    }

    // Scanned PDF — fall back to vision using the raw bytes as base64.
    // We send the PDF bytes directly; vision-capable models accept PDF pages as images.
    const imageBase64 = buffer.toString("base64");
    return { imageBase64, imageMimeType: "application/pdf", method: "vision" };
  }

  throw new Error(`Unsupported file type: ${ext}. Supported: .pdf, .jpg, .jpeg, .png`);
}

function buildVisionResult(filePath: string, ext: string): IngestResult {
  const buffer = readFileSync(filePath);
  return {
    imageBase64: buffer.toString("base64"),
    imageMimeType: MIME[ext] ?? "image/jpeg",
    method: "vision",
  };
}
