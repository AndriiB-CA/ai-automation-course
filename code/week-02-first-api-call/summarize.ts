/**
 * Week 2 — Your First Real API Call
 *
 * A CLI tool that fetches a URL, extracts readable text,
 * and streams a 3-bullet summary to stdout.
 *
 * Works with any provider — set LLM_BASE_URL / LLM_API_KEY / LLM_MODEL first.
 * See PROVIDERS.md at the repo root.
 *
 * Usage:
 *   cp .env.example .env && $EDITOR .env
 *   npx tsx summarize.ts https://example.com
 *   npx tsx summarize.ts https://example.com --tone=snarky
 *
 * Focus concepts:
 *   - The Chat Completions request shape (the one every provider speaks)
 *   - System vs user messages
 *   - Streaming responses
 *   - Cost tracking
 */

import "dotenv/config";
import { JSDOM } from "jsdom";
import process from "node:process";
import { createClient, explainError, formatUsage, getModel } from "./llm.js";

// ---- Parse args -----------------------------------------------------------
const args = process.argv.slice(2);
const urlArg = args.find((a) => !a.startsWith("--"));
const toneArg = args.find((a) => a.startsWith("--tone="))?.split("=")[1];
const tone = (toneArg as "formal" | "casual" | "snarky") ?? "casual";

if (!urlArg) {
  console.error("Usage: summarize <url> [--tone=formal|casual|snarky]");
  process.exit(1);
}
const url: string = urlArg;

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

// ---- Main -----------------------------------------------------------------
async function main() {
  console.error(`→ Fetching ${url}...`);
  const pageText = await fetchReadableText(url);
  console.error(`→ Extracted ${pageText.length} chars. Summarizing...\n`);

  const client = createClient();
  const model = getModel();

  // Streaming: print tokens as they arrive.
  // `stream_options.include_usage` asks for a final chunk carrying token counts.
  // Not every provider honours it — hence the null check further down. That is
  // your first taste of "OpenAI-compatible" meaning "mostly".
  const stream = await client.chat.completions.create({
    model,
    max_tokens: 400,
    stream: true,
    stream_options: { include_usage: true },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `<page_url>${url}</page_url>\n\n<page_text>\n${pageText}\n</page_text>\n\nSummarize.`,
      },
    ],
  });

  let usage;
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) process.stdout.write(delta);
    if (chunk.usage) usage = chunk.usage;
  }
  console.log("\n");

  console.error(`---`);
  if (usage) {
    console.error(formatUsage(model, usage));
  } else {
    console.error(`${model} · this provider didn't report token usage on a stream.`);
    console.error(`  Re-run without streaming if you need exact counts.`);
  }
}

main().catch((err) => {
  console.error("✗ Failed:", explainError(err));
  process.exit(1);
});
