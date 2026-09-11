import OpenAI from "openai";
import { createClient, estimateCost, getModel } from "./llm.js";
import { InvoiceExtraction } from "./schemas.js";
import type { InvoiceExtraction as InvoiceExtractionT } from "./schemas.js";

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  /** USD, or null when LLM_PRICE_*_PER_MTOK are unset. */
  estimatedCostUSD: number | null;
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

const EMIT_INVOICE_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_invoice",
    description: "Emit structured invoice/receipt data extracted from the document.",
    parameters: {
      type: "object",
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
  },
};

export async function extractInvoice(input: ExtractInput): Promise<ExtractResult> {
  if (!input.text && !input.imageBase64) {
    throw new Error("extractInvoice requires either text or imageBase64");
  }

  const client = createClient();
  const model = getModel();

  // Vision travels as an image_url part with a data: URI. That encoding is the
  // portable one — it's what the OpenAI-compatible schema specifies, and what
  // providers that support vision at all will accept. Providers that don't
  // support vision return a 400 here rather than silently dropping the image,
  // which is the failure mode you want.
  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  if (input.imageBase64 && input.imageMimeType) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${input.imageMimeType};base64,${input.imageBase64}` },
    });
    userContent.push({
      type: "text",
      text: "Extract all invoice data from this document using the emit_invoice tool.",
    });
  } else {
    userContent.push({
      type: "text",
      text: `Extract all invoice data from the following document text using the emit_invoice tool.\n\n${input.text}`,
    });
  }

  const response = await client.chat.completions.create({
    model,
    max_tokens: 2048,
    temperature: 0,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
    tools: [EMIT_INVOICE_TOOL],
    tool_choice: { type: "function", function: { name: "emit_invoice" } },
  });

  const call = response.choices[0]?.message?.tool_calls?.[0];
  if (!call || !("function" in call)) {
    throw new Error(
      "Model did not call emit_invoice. Response:\n" +
        JSON.stringify(response.choices[0]?.message, null, 2),
    );
  }

  const extraction = InvoiceExtraction.parse(JSON.parse(call.function.arguments));

  const { inputTokens, outputTokens, usd } = estimateCost(response.usage);
  return {
    extraction,
    usage: { inputTokens, outputTokens, estimatedCostUSD: usd },
  };
}
