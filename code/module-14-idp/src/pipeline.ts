import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { detectAndExtract } from "./ingest.js";
import { extractInvoice } from "./extract.js";
import type { UsageStats } from "./extract.js";
import { validateExtraction } from "./validate.js";
import type { InvoiceExtraction, ValidationResult } from "./schemas.js";

export interface PipelineResult {
  status: "ok" | "review";
  extraction: InvoiceExtraction;
  validation: ValidationResult;
  method: "native" | "vision";
  usage: UsageStats;
}

export interface PipelineOptions {
  confidenceThreshold?: number;
}

const DEFAULT_THRESHOLD = 0.7;

// All output paths are resolved and verified to stay inside cwd.
const CWD = process.cwd();

function safeResolve(dir: string, filename: string): string {
  const resolved = resolve(CWD, dir, filename);
  if (!resolved.startsWith(resolve(CWD))) {
    throw new Error(`Path traversal detected: ${resolved} is outside ${CWD}`);
  }
  return resolved;
}

export async function processDocument(
  filePath: string,
  options: PipelineOptions = {},
): Promise<PipelineResult> {
  const threshold = options.confidenceThreshold ?? DEFAULT_THRESHOLD;
  const absoluteInput = resolve(filePath);

  // 1. Ingest
  const ingestResult = await detectAndExtract(absoluteInput);

  // 2. Extract
  const { extraction, usage } = await extractInvoice({
    text: ingestResult.text,
    imageBase64: ingestResult.imageBase64,
    imageMimeType: ingestResult.imageMimeType,
  });

  // 3. Validate
  const validation = validateExtraction(extraction);

  const needsReview = !validation.valid || extraction.confidence < threshold;
  const base = basename(absoluteInput);
  const status: "ok" | "review" = needsReview ? "review" : "ok";

  if (needsReview) {
    const reviewDir = safeResolve("review", "");
    mkdirSync(reviewDir, { recursive: true });

    const destFile = safeResolve("review", base);
    copyFileSync(absoluteInput, destFile);

    const sidecar = safeResolve("review", `${base}.review.json`);
    const sidecarData = {
      source: absoluteInput,
      reason: needsReview
        ? [
            ...(!validation.valid ? [`validation errors: ${validation.errors.join("; ")}`] : []),
            ...(extraction.confidence < threshold
              ? [`confidence ${extraction.confidence} below threshold ${threshold}`]
              : []),
          ]
        : [],
      validation,
      confidence: extraction.confidence,
    };
    writeFileSync(sidecar, JSON.stringify(sidecarData, null, 2), "utf-8");
  } else {
    const outputDir = safeResolve("output", "");
    mkdirSync(outputDir, { recursive: true });

    const outFile = safeResolve("output", `${base}.json`);
    writeFileSync(outFile, JSON.stringify(extraction, null, 2), "utf-8");
  }

  return { status, extraction, validation, method: ingestResult.method, usage };
}
