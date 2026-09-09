import Anthropic from "@anthropic-ai/sdk";
import { InvoiceExtraction } from "./schemas.js";
import type { InvoiceExtraction as InvoiceExtractionT } from "./schemas.js";

const MODEL = "claude-sonnet-5";

// Pricing (USD per million tokens)
const PRICE_INPUT_PER_M = 2.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 10.0;

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  estimatedCostUSD: number;
}

export interface ExtractInput {
  text?: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ExtractResult {
  extraction: InvoiceExtractionT;
  usage: UsageStats;
}

const SYSTEM_PROMPT = `You are an expert invoice and receipt data extraction assistant.

Your task is to extract all relevant fields from the provided document — whether it is a text-based invoice or a scanned image.

Rules:
- Extract ALL line items visible in the document.
- Monetary values must be plain numbers (no currency symbols).
- The currency field must be a 3-letter ISO code (e.g. USD, EUR, GBP).
- The date field must preserve the original format as written on the document.
- Set confidence between 0 and 1 reflecting how certain you are about the extraction (1 = perfectly legible, 0 = nearly unreadable).
- If a field is absent from the document, use an empty string for strings and 0 for numbers.
- Never guess amounts; use 0 if unreadable.
- Call emit_invoice with all extracted data.`;

const EMIT_INVOICE_TOOL: Anthropic.Tool = {
  name: "emit_invoice",
  description: "Emit structured invoice/receipt data extracted from the document.",
  input_schema: {
    type: "object" as const,
    required: [
      "vendor",
      "invoice_number",
      "date",
      "line_items",
      "subtotal",
      "tax",
      "total",
      "currency",
      "confidence",
    ],
    properties: {
      vendor: { type: "string", description: "Vendor or supplier name." },
      invoice_number: { type: "string", description: "Invoice or receipt number." },
      date: { type: "string", description: "Invoice date as written on the document." },
      line_items: {
        type: "array",
        description: "All line items on the invoice.",
        items: {
          type: "object",
          required: ["description", "quantity", "unitPrice", "total"],
          properties: {
            description: { type: "string" },
            quantity: { type: "number" },
            unitPrice: { type: "number" },
            total: { type: "number" },
          },
        },
      },
      subtotal: { type: "number", description: "Subtotal before tax." },
      tax: { type: "number", description: "Total tax amount." },
      total: { type: "number", description: "Grand total including tax." },
      currency: { type: "string", description: "3-letter ISO currency code." },
      confidence: {
        type: "number",
        description: "Extraction confidence 0–1.",
        minimum: 0,
        maximum: 1,
      },
    },
  },
};

function calcCost(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): UsageStats {
  const inputTokens = usage.input_tokens;
  const outputTokens = usage.output_tokens;
  const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
  const cacheReadTokens = usage.cache_read_input_tokens ?? 0;

  const estimatedCostUSD =
    (inputTokens / 1_000_000) * PRICE_INPUT_PER_M +
    (cacheWriteTokens / 1_000_000) * PRICE_CACHE_WRITE_PER_M +
    (cacheReadTokens / 1_000_000) * PRICE_CACHE_READ_PER_M +
    (outputTokens / 1_000_000) * PRICE_OUTPUT_PER_M;

  return { inputTokens, outputTokens, cacheWriteTokens, cacheReadTokens, estimatedCostUSD };
}

export async function extractInvoice(input: ExtractInput): Promise<ExtractResult> {
  if (!input.text && !input.imageBase64) {
    throw new Error("extractInvoice requires either text or imageBase64");
  }

  const client = new Anthropic();

  type UserContentBlock =
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

  const userContent: UserContentBlock[] = [];

  if (input.imageBase64 && input.imageMimeType) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.imageMimeType,
        data: input.imageBase64,
      },
    });
    userContent.push({ type: "text", text: "Extract all invoice data from this document using the emit_invoice tool." });
  } else {
    userContent.push({
      type: "text",
      text: `Extract all invoice data from the following document text using the emit_invoice tool.\n\n${input.text}`,
    });
  }

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        // Cache the system prompt — extraction instructions are stable across documents.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    tools: [EMIT_INVOICE_TOOL],
    tool_choice: { type: "tool", name: "emit_invoice" },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: userContent as any }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "Claude did not call emit_invoice. Response:\n" + JSON.stringify(response.content, null, 2),
    );
  }

  const extraction = InvoiceExtraction.parse(toolUse.input);
  const usage = calcCost(response.usage);

  return { extraction, usage };
}
