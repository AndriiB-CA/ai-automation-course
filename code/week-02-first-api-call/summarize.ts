/**
 * Week 2 — Your First Real API Call
 *
 * A CLI tool that fetches a URL, extracts readable text,
 * and streams a 3-bullet summary to stdout.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npx tsx summarize.ts https://example.com
 *   npx tsx summarize.ts https://example.com --tone=snarky
 *
 * Focus concepts:
 *   - Messages API basics
 *   - System vs user prompts
 *   - Streaming responses
 *   - Cost tracking
 */

import Anthropic from "@anthropic-ai/sdk";
import { JSDOM } from "jsdom";
import process from "node:process";

// ---- Parse args -----------------------------------------------------------
const args = process.argv.slice(2);
const url = args.find((a) => !a.startsWith("--"));
const toneArg = args.find((a) => a.startsWith("--tone="))?.split("=")[1];
const tone = (toneArg as "formal" | "casual" | "snarky") ?? "casual";

if (!url) {
  console.error("Usage: summarize <url> [--tone=formal|casual|snarky]");
  process.exit(1);
}

// ---- Fetch + extract text -------------------------------------------------
async function fetchReadableText(target: string): Promise<string> {
  const resp = await fetch(target, {
    headers: { "User-Agent": "ai-course-week2/0.1" },
  });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status} ${resp.statusText}`);
  const html = await resp.text();
  const dom = new JSDOM(html);
  // Remove scripts/styles before text extraction
  dom.window.document.querySelectorAll("script, style, nav, footer").forEach((el) => el.remove());
  const text = dom.window.document.body?.textContent ?? "";
  // Collapse whitespace & cap to ~8k chars (roughly 2k tokens) for this exercise
  return text.replace(/\s+/g, " ").trim().slice(0, 8_000);
}

// ---- Prompting ------------------------------------------------------------
const TONE_INSTRUCTIONS: Record<string, string> = {
  formal: "Use formal, professional language. No contractions. No emoji.",
  casual: "Use a friendly, conversational tone. Light and approachable.",
  snarky:
    "Use a dry, sardonic tone. The reader should smirk. Never insult the content itself — just be wry about it.",
};

const SYSTEM_PROMPT = `You are a precise summarizer. Given the text content of a web page,
produce EXACTLY three bullet points capturing the most important information.

Rules:
- Each bullet MUST be a single sentence
- No preamble, no postamble — just the bullets
- Lead each bullet with "• "
- Focus on claims, facts, or decisions; skip navigation, ads, boilerplate

Tone for today: ${TONE_INSTRUCTIONS[tone]}`;

// ---- Cost tracking --------------------------------------------------------
const PRICES_PER_MTOK = {
  "claude-sonnet-4-5": { input: 3.0, output: 15.0 },
  "claude-haiku-4-5-20251001": { input: 1.0, output: 5.0 },
};

function formatUSD(n: number): string {
  return `$${n.toFixed(6)}`;
}

// ---- Main -----------------------------------------------------------------
async function main() {
  console.error(`→ Fetching ${url}...`);
  const pageText = await fetchReadableText(url);
  console.error(`→ Extracted ${pageText.length} chars. Summarizing...\n`);

  const client = new Anthropic();
  const model = "claude-sonnet-4-5";

  // Streaming: print tokens as they arrive
  const stream = client.messages.stream({
    model,
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `<page_url>${url}</page_url>\n\n<page_text>\n${pageText}\n</page_text>\n\nSummarize.`,
      },
    ],
  });

  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }
  console.log("\n");

  // Final usage stats
  const finalMsg = await stream.finalMessage();
  const prices = PRICES_PER_MTOK[model as keyof typeof PRICES_PER_MTOK];
  const inputCost = (finalMsg.usage.input_tokens / 1_000_000) * prices.input;
  const outputCost = (finalMsg.usage.output_tokens / 1_000_000) * prices.output;

  console.error(`---`);
  console.error(`Model: ${model}`);
  console.error(`Tokens: in=${finalMsg.usage.input_tokens} out=${finalMsg.usage.output_tokens}`);
  console.error(`Cost: ${formatUSD(inputCost + outputCost)}`);
}

main().catch((err) => {
  console.error("✗ Failed:", err.message);
  process.exit(1);
});
