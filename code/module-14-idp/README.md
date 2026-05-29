# Module 14 — Intelligent Document Processing (IDP)

An end-to-end pipeline that extracts structured data from invoices and receipts (PDF or image), validates the extraction deterministically, and routes documents to `output/` (clean) or `review/` (needs human check).

## What it does

1. **Ingest** (`src/ingest.ts`) — detects whether a document has a native text layer (PDF with >50 chars of extractable text) or must be handled via vision (scanned PDF, JPEG, PNG).
2. **Extract** (`src/extract.ts`) — calls `claude-sonnet-4-6` with a cached system prompt and a forced `emit_invoice` tool call. Returns a Zod-validated `InvoiceExtraction`.
3. **Validate** (`src/validate.ts`) — pure deterministic checks: line-item sums, subtotal+tax=total, date parseability, ISO currency code recognition.
4. **Pipeline** (`src/pipeline.ts`) — orchestrates the three steps and routes output:
   - `output/<filename>.json` — high-confidence, validation-passing extractions
   - `review/<filename>` + `review/<filename>.review.json` — anything that fails validation or falls below the confidence threshold
5. **CLI** (`src/cli.ts`) — accepts a file path or glob, processes all matches, prints a summary table.

## Setup

```bash
cd code/module-14-idp
npm install
cp .env.example .env
# edit .env and set ANTHROPIC_API_KEY=sk-ant-...
```

## Running

```bash
# Single file
npx tsx src/cli.ts sample-docs/invoice.pdf

# Glob
npx tsx src/cli.ts 'sample-docs/*.pdf'

# Custom confidence threshold (default 0.7)
npx tsx src/cli.ts 'sample-docs/*' --threshold=0.8
```

## Output directories

`output/` and `review/` are created at runtime and are listed in `.gitignore`. Never commit extracted invoice data — it may contain PII.

## Module 14 Rubric Checklist

- [x] Native text extraction for text-layer PDFs (`pdf-parse`)
- [x] Vision fallback for scanned PDFs and images (base64 → Claude image block)
- [x] Structured extraction via forced tool call (`emit_invoice`)
- [x] Prompt caching on system prompt (`cache_control: { type: "ephemeral" }`)
- [x] Zod schema validation before trusting LLM output
- [x] Deterministic post-extraction validation (math checks, currency, date)
- [x] Confidence-threshold routing to `review/` vs `output/`
- [x] Sidecar `.review.json` explaining why a document was flagged
- [x] No PII logged to console — only filename and status
- [x] All write paths resolved with `path.resolve` and checked against `cwd`
- [x] `output/` and `review/` in `.gitignore`
- [x] Cost/token summary printed after each run
- [x] ESM TypeScript with `NodeNext` module resolution
