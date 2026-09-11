# Module 14 — Intelligent Document Processing

**Build-phase application · best done as a project around Weeks 11–12 (after RAG) · ~6 hours**

> 🧭 **Where this fits:** Document processing is the single largest real-world use case for AI automation — and it's nearly absent from most curricula. It builds directly on your structured-outputs skills (Week 3) and RAG (Weeks 9–12), so it's a high-ROI addition. If you want one more portfolio piece that screams "I can do enterprise automation," this is it.

---

## Why this module matters

Walk into almost any company and you'll find documents that humans process by hand: invoices, contracts, claims, forms, clinical notes, regulatory filings. Intelligent Document Processing (IDP) automates this, and it's where a large share of automation budget actually goes. Modern systems handle documents with complex formatting, domain jargon, and implicit context that genuinely requires comprehension — work that was impossible with rule-based OCR five years ago. Public examples run at serious scale: large retailers extract structured product attributes from mixed text-and-image documents to populate catalogs; healthcare orgs process tens of thousands of clinical documents monthly at ~94% extraction accuracy and ~12 seconds per document. The engineering challenge isn't any single step — it's orchestrating the pipeline at scale with acceptable latency, cost, and accuracy.

## Learning objectives

- Build a multi-stage IDP pipeline from raw document to validated structured data
- Choose between native text extraction, OCR, and vision-based understanding
- Validate extractions against business rules and reference data
- Measure extraction quality the way you'd measure a test suite
- Handle the long tail: bad scans, unusual layouts, multi-language

---

## Part 1 — The IDP pipeline

The canonical pattern is four stages. Each is a place where things break, so each gets its own handling and metrics.

```
  ┌─────────────┐   ┌──────────────┐   ┌──────────────┐   ┌─────────────┐
  │ 1. Ingest & │──►│ 2. Understand│──►│ 3. Validate  │──►│ 4. Structure│
  │  Extract    │   │  (LLM/vision)│   │ (rules + ref)│   │  & Output   │
  └─────────────┘   └──────────────┘   └──────────────┘   └─────────────┘
   OCR or native     entity extraction    business rules,    schema-valid
   text; rasterize   + comprehension      cross-check vs     JSON to the
   if scanned        with context         source-of-truth    target system
```

1. **Ingest & Extract.** Native text (PDF with a text layer) is cheap and accurate — use it when available. Scanned/image documents need OCR (Tesseract, or cloud OCR) or direct vision-model ingestion. Decide per document type; don't OCR what already has text.
2. **Understand.** Send the extracted content (or the image, for vision models) to the LLM with a tight extraction schema. This is Week 3's structured-outputs pattern at production scale — Zod schema, tool-forced output, retry on validation failure.
3. **Validate.** The LLM proposes; deterministic rules dispose. Cross-check extracted values against business rules (totals add up, dates are plausible) and reference data (does this PO number exist? does the vendor match?). This is the step that turns "demo" into "trustworthy."
4. **Structure & Output.** Emit schema-valid data to the target system, and route low-confidence or rule-failing extractions to a human queue (Constrained Autonomy from Module 12 — autonomous for the clean ones, human for the exceptions).

### Reading (75 min)
- **Your provider's vision docs** — confirm first that the model you configured accepts images at all. Many small and open-weight models don't, and a document pipeline without vision can only handle text-layer PDFs
- **Your provider's PDF support** — some accept PDFs directly; where yours doesn't, rasterise pages to PNG and send them as images (the starter does this)
- Structured outputs recap — Module 1, Week 3. Same forced-tool-call + Zod validate-and-retry pattern, now applied to documents

> ⚠️ **This is the module most sensitive to your provider choice.** Extraction quality on smudged scans varies enormously between models, far more than on text tasks. Budget for running Week 11's evals against two providers here — it is the clearest demonstration in the whole course of why evals beat vibes.
- Skim one vendor's framing to understand the market: [What is IDP — AWS](https://aws.amazon.com/what-is/intelligent-document-processing/)

---

## Part 2 — Native text vs OCR vs vision

A decision that drives cost, accuracy, and latency:

| Approach | Use when | Trade-off |
|---|---|---|
| **Native text extraction** | PDF has a real text layer | Cheapest, fastest, most accurate — always prefer if available |
| **OCR then LLM** | Scanned docs, images, faxes | OCR errors propagate; cheaper than vision at high volume |
| **Vision model (direct)** | Complex layouts, tables, forms, handwriting, text+image mix | Most capable, highest cost/latency; often best accuracy on messy docs |

In practice, production pipelines branch: detect whether a text layer exists, route accordingly, and reserve vision for the documents that actually need it.

---

## Part 3 — Measuring extraction quality (your QA superpower again)

IDP without evals is a liability. Treat extraction like a test suite:

- **Field-level accuracy** — for each field (invoice total, date, vendor), what % of documents extract correctly? Track per field; a pipeline can be 99% on totals and 70% on line items.
- **Precision/recall on entities** — especially for multi-value fields like line items
- **Confidence calibration** — when the model says it's unsure, is it actually more likely to be wrong? You need this to set the human-review threshold.
- **Cost & latency per document** — your production budget
- **Exception rate** — what fraction routes to humans? This drives the ROI model from Module 13.

Build a golden set of ~30 documents with known-correct extractions (hand-labeled). Run your pipeline against it in CI (Promptfoo from Week 7). A prompt or model change that drops field accuracy fails the build.

> 🧪 **QA bridge:** A golden document set is a regression suite. Confidence calibration is flaky-test analysis. You've done all of this — the artifacts are just PDFs instead of web pages.

---

## Part 4 — Batch processing economics (the lever everyone forgets)

The starter pipeline processes documents synchronously — one API call, wait, next. That's the right shape for a demo and for low-latency intake (a user uploads a receipt and waits). But the flagship enterprise IDP scenario is different: **10,000 invoices land in a folder overnight, and nobody is waiting on any individual one.**

That workload has a purpose-built API: the **Message Batches API** (`POST /v1/messages/batches`).

| | Synchronous pipeline | Batch API |
|---|---|---|
| Cost | Standard token pricing | **50% off all token usage** |
| Latency per doc | Seconds | Most batches finish within 1 hour (max 24h) |
| Scale per submission | One request at a time | Up to 100,000 requests / 256 MB per batch |
| Feature support | Everything | Everything — vision, tool use, prompt caching all work |
| Failure handling | You retry inline | Per-request result: `succeeded` / `errored` / `expired` — retry just the failures |

The workflow is: build the same request payloads your pipeline already constructs, submit them in one batch with a `custom_id` per document, poll `processing_status` until `"ended"`, then stream the results. Two things bite people:

- **Results come back in arbitrary order.** Always match by `custom_id` (use the document filename), never by position.
- **Validation still runs on your side.** The batch gives you raw extractions; your deterministic validation layer and `review/` routing don't change at all. This is the payoff of separating extraction from validation in the pipeline design.

**Why this matters for the business case:** at $0.01–0.03 per document synchronous, a 100K-document backfill is real money — batch cuts that in half with zero quality loss. When you build the ROI model in Module 13, quote the batch rate for bulk processing and the synchronous rate only for the low-latency intake path. Knowing this split exists is exactly the kind of cost-engineering detail that reads as senior in an interview (and pairs with the caching/routing levers from Week 22).

---

## Weekend project (4–5 hours)

**Build an invoice (or receipt) processing pipeline.**

> 🚀 **Starter code:** [`/code/module-14-idp`](../code/module-14-idp/) — a runnable pipeline skeleton: native-text vs. vision ingest detection, forced-tool-call extraction with prompt caching, a deterministic validation layer (totals reconcile, date/currency checks), and confidence-threshold routing to `output/` vs `review/`. Start there and build the golden set + accuracy report on top.

Pick a document type you can get 30+ samples of — invoices, receipts, or even your own utility bills (local only 🛡️; redact before committing anything).

Requirements (the rubric):
- [ ] Detects native text vs. needs-OCR/vision and routes accordingly
- [ ] Extracts to a Zod-validated schema: `{ vendor, invoice_number, date, line_items[], subtotal, tax, total, currency }`
- [ ] **Validation layer:** totals reconcile (line items + tax = total), date is plausible, currency is recognized
- [ ] **Confidence + human queue:** low-confidence or rule-failing docs route to a `review/` folder with the reason
- [ ] Golden set of 30 docs with hand-labeled ground truth
- [ ] **Field-level accuracy report** + cost per document + exception rate
- [ ] Prompt caching on the extraction system prompt (Week 22)

### Stretch
- Convert the pipeline to the **Batch API** (Part 4): submit your 30-doc golden set as one batch, match results by `custom_id`, run them through the same validation layer, and measure the cost delta vs. the synchronous run. Add both numbers to your accuracy report.
- Add a second document type and a router that picks the right schema (this is the multi-agent manager pattern from Module 12 in miniature)
- Add multi-language handling and measure the accuracy delta
- Wire the human-review queue to a simple n8n notification (preview of Weeks 25–26)

### 🛡️ Security & privacy callout
Documents are the highest-PII artifact you'll handle in this course. Redact before sending to any API where required, never commit real documents to a public repo, log extractions without raw PII, and treat the source documents as sensitive. If you process anything real, understand the data-handling terms of your model provider.

---

## Self-check

- [ ] You can describe the four-stage IDP pipeline and the failure mode of each stage
- [ ] You can decide native-vs-OCR-vs-vision for a given document type and justify it
- [ ] Your pipeline validates extractions against business rules, not just a schema
- [ ] You measure field-level accuracy against a golden set
- [ ] Low-confidence extractions route to a human, not silently through

---

## Daily 15-min tasks

- **Mon:** Read one IDP case study; note the accuracy and throughput numbers they claim
- **Tue:** Run your pipeline on one deliberately messy document; watch where it breaks
- **Wed:** Add one validation rule that catches a real error class
- **Thu:** Improve the extraction prompt for one weak field; re-measure on the golden set
- **Fri:** Check cost per document; try the cheaper model on the easy docs only

---

## ⏭️ Next up
IDP is a flagship portfolio piece for automation roles — pair its README with a Module 13 ROI model and you have a project that speaks directly to enterprise hiring managers. It also slots neatly into **Weeks 25–26 (n8n)** as the "AI execution" step inside a larger orchestrated workflow (email in → extract → validate → post to system → notify).
