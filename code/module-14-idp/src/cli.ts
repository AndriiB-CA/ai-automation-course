#!/usr/bin/env tsx
import "dotenv/config";
import { glob } from "glob";
import { resolve } from "node:path";
import { processDocument } from "./pipeline.js";
import type { UsageStats } from "./extract.js";

// ── Argument parsing ─────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
  console.log("Usage: npx tsx src/cli.ts <file-or-glob> [--threshold=0.7]");
  console.log("");
  console.log("Examples:");
  console.log("  npx tsx src/cli.ts sample-docs/invoice.pdf");
  console.log("  npx tsx src/cli.ts 'sample-docs/*.pdf' --threshold=0.8");
  process.exit(0);
}

const patternArg = args.find((a) => !a.startsWith("--")) ?? "";
const thresholdArg = args.find((a) => a.startsWith("--threshold="));
const threshold = thresholdArg ? parseFloat(thresholdArg.split("=")[1]!) : 0.7;

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY is not set. Copy .env.example → .env and add your key.");
  process.exit(1);
}

// ── File discovery ───────────────────────────────────────────────────────────

const files = await glob(patternArg, { absolute: false });

if (files.length === 0) {
  console.error(`No files matched: ${patternArg}`);
  process.exit(1);
}

// ── Processing ───────────────────────────────────────────────────────────────

interface RowResult {
  filename: string;
  status: "ok" | "review" | "error";
  confidence: number | null;
  costUSD: number;
  error?: string;
}

const rows: RowResult[] = [];
const totalUsage: UsageStats = {
  inputTokens: 0,
  outputTokens: 0,
  cacheWriteTokens: 0,
  cacheReadTokens: 0,
  estimatedCostUSD: 0,
};

console.log(`\nProcessing ${files.length} file(s) with confidence threshold ${threshold}...\n`);

for (const file of files) {
  const absFile = resolve(file);
  // Log only filename — never log PII fields like vendor or invoice_number.
  process.stdout.write(`  ${file} ... `);

  try {
    const result = await processDocument(absFile, { confidenceThreshold: threshold });

    totalUsage.inputTokens += result.usage.inputTokens;
    totalUsage.outputTokens += result.usage.outputTokens;
    totalUsage.cacheWriteTokens += result.usage.cacheWriteTokens;
    totalUsage.cacheReadTokens += result.usage.cacheReadTokens;
    totalUsage.estimatedCostUSD += result.usage.estimatedCostUSD;

    console.log(`${result.status.toUpperCase()} (confidence: ${result.extraction.confidence.toFixed(2)})`);

    rows.push({
      filename: file,
      status: result.status,
      confidence: result.extraction.confidence,
      costUSD: result.usage.estimatedCostUSD,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.log(`ERROR`);
    rows.push({ filename: file, status: "error", confidence: null, costUSD: 0, error: message });
  }
}

// ── Summary table ─────────────────────────────────────────────────────────────

const COL_FILE = 40;
const COL_STATUS = 8;
const COL_CONF = 12;
const COL_COST = 12;

function pad(s: string, n: number): string {
  return s.length >= n ? s.slice(0, n - 1) + "…" : s.padEnd(n);
}

const hr = "─".repeat(COL_FILE + COL_STATUS + COL_CONF + COL_COST + 3);
console.log("\n" + hr);
console.log(
  pad("File", COL_FILE) +
    pad("Status", COL_STATUS) +
    pad("Confidence", COL_CONF) +
    pad("Est. Cost", COL_COST),
);
console.log(hr);

for (const row of rows) {
  const conf = row.confidence !== null ? row.confidence.toFixed(2) : "n/a";
  const cost = `$${row.costUSD.toFixed(4)}`;
  const statusLabel = row.status === "error" ? "ERROR" : row.status.toUpperCase();
  console.log(pad(row.filename, COL_FILE) + pad(statusLabel, COL_STATUS) + pad(conf, COL_CONF) + pad(cost, COL_COST));
  if (row.error) {
    console.log(`  ${" ".repeat(COL_FILE)}Error: ${row.error}`);
  }
}

console.log(hr);

const okCount = rows.filter((r) => r.status === "ok").length;
const reviewCount = rows.filter((r) => r.status === "review").length;
const errorCount = rows.filter((r) => r.status === "error").length;

console.log(`\nTotal: ${files.length} file(s)  |  OK: ${okCount}  |  Review: ${reviewCount}  |  Error: ${errorCount}`);
console.log(`Total estimated cost: $${totalUsage.estimatedCostUSD.toFixed(4)} USD`);
console.log(`Tokens — input: ${totalUsage.inputTokens.toLocaleString()}, cache writes: ${totalUsage.cacheWriteTokens.toLocaleString()}, cache reads: ${totalUsage.cacheReadTokens.toLocaleString()}, output: ${totalUsage.outputTokens.toLocaleString()}`);
console.log("");
