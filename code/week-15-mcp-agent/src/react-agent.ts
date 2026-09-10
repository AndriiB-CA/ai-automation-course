/**
 * ReAct-style multi-tool research agent
 *
 * Loop: build messages → call the model → execute tool calls → feed results
 *       back → repeat until a final text answer or max 15 iterations.
 *
 * Runs on any OpenAI-compatible provider. Set LLM_BASE_URL / LLM_API_KEY /
 * LLM_MODEL (and optionally LLM_MODEL_SMALL) — see PROVIDERS.md.
 *
 * Budget cap: a token ceiling always applies; a USD ceiling applies as well
 * once you've set LLM_PRICE_IN_PER_MTOK / LLM_PRICE_OUT_PER_MTOK.
 *
 * Usage:
 *   npm run agent
 *   npm run agent -- "Your custom task here"
 */

import "dotenv/config";
import type OpenAI from "openai";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, estimateCost, explainError, getModel, getSmallModel } from "./llm.js";

const MAX_ITERATIONS = 15;

/** Always-available ceiling: every provider reports token counts. */
const TOKEN_CAP = 120_000;
/** Extra ceiling, only enforceable once .env knows what tokens cost. */
const BUDGET_CAP_USD = Number(process.env.BUDGET_CAP_USD) || 0.5;

const NOTES_DIR = resolve(process.cwd(), "notes");

const client = createClient();
const CHAT_MODEL = getModel();
const CHEAP_MODEL = getSmallModel();

let totalInputTokens = 0;
let totalOutputTokens = 0;

function trackUsage(usage: OpenAI.CompletionUsage | undefined): void {
  totalInputTokens += usage?.prompt_tokens ?? 0;
  totalOutputTokens += usage?.completion_tokens ?? 0;
}

function totalCostUsd(): number | null {
  return estimateCost({
    prompt_tokens: totalInputTokens,
    completion_tokens: totalOutputTokens,
  }).usd;
}

function spendLabel(): string {
  const usd = totalCostUsd();
  const tokens = (totalInputTokens + totalOutputTokens).toLocaleString();
  return usd === null ? `${tokens} tok` : `$${usd.toFixed(4)} (${tokens} tok)`;
}

/** Returns a reason when a ceiling is hit, or null to keep going. */
function capReached(): string | null {
  const tokens = totalInputTokens + totalOutputTokens;
  if (tokens >= TOKEN_CAP) return `token cap ${TOKEN_CAP.toLocaleString()} reached`;
  const usd = totalCostUsd();
  if (usd !== null && usd >= BUDGET_CAP_USD) return `budget cap $${BUDGET_CAP_USD} reached`;
  return null;
}

function log(tag: "[think]" | "[act]" | "[observe]" | "[budget]" | "[done]", msg: string): void {
  console.log(`${tag} ${msg}`);
}

async function web_search(query: string): Promise<string> {
  const results = [
    { title: `MCP Adoption Trends 2026`, url: `https://example-ai-report.dev/mcp-2026`, snippet: `Model Context Protocol has seen rapid adoption in 2026, with over 9,400 MCP servers published...` },
    { title: `How MCP Is Reshaping AI Agent Ecosystems`, url: `https://techblog.example.com/mcp-ecosystem`, snippet: `Unlike earlier function-calling approaches, MCP's bi-directional transport and typed tool registry allow agents to discover capabilities at runtime...` },
    { title: `GitHub: modelcontextprotocol`, url: `https://github.com/modelcontextprotocol`, snippet: `The official MCP organisation now hosts 18 reference server implementations covering databases, code execution, search APIs, and more...` },
  ].map((r) => `[${r.title}](${r.url})\n${r.snippet}`);
  return `Search results for "${query}":\n\n` + results.join("\n\n---\n\n");
}

async function web_fetch(url: string): Promise<string> {
  try {
    const response = await fetch(url, { headers: { "User-Agent": "week-15-mcp-agent/0.1" }, signal: AbortSignal.timeout(10_000) });
    if (!response.ok) return `HTTP ${response.status}: ${response.statusText}`;
    const html = await response.text();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ").trim();
    return text.length > 8_000 ? text.slice(0, 8_000) + "\n…[truncated]" : text;
  } catch (err) {
    return `fetch error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function summarize(text: string, target_words: number): Promise<string> {
  // Note this uses the *small* model. Summarising is exactly the kind of
  // narrow, high-volume step that doesn't need your best model — Module 7.
  const response = await client.chat.completions.create({
    model: CHEAP_MODEL,
    max_tokens: Math.min(target_words * 2, 2048),
    messages: [{ role: "user", content: `Summarise the following text in approximately ${target_words} words. Be concise and factual.\n\n${text}` }],
  });
  trackUsage(response.usage);
  return response.choices[0]?.message?.content ?? "";
}

function save_note(title: string, content: string): string {
  mkdirSync(NOTES_DIR, { recursive: true });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filePath = join(NOTES_DIR, `${slug}.md`);
  writeFileSync(filePath, `# ${title}\n\n${content}\n`, "utf8");
  return `Note saved to ${filePath}`;
}

function list_notes(): string {
  try {
    mkdirSync(NOTES_DIR, { recursive: true });
    const files = readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"));
    if (files.length === 0) return "No notes saved yet.";
    return files.map((f) => {
      const raw = readFileSync(join(NOTES_DIR, f), "utf8");
      const firstLine = raw.split("\n")[0]?.replace(/^#+\s*/, "") ?? f;
      return `• ${f} — ${firstLine}`;
    }).join("\n");
  } catch { return "notes directory not found"; }
}

type ToolInput = Record<string, unknown>;

async function dispatchTool(name: string, input: ToolInput): Promise<string> {
  switch (name) {
    case "web_search": return web_search(input.query as string);
    case "web_fetch": return web_fetch(input.url as string);
    case "summarize": return summarize(input.text as string, (input.target_words as number) ?? 150);
    case "save_note": return save_note(input.title as string, input.content as string);
    case "list_notes": return list_notes();
    default: return `Unknown tool: ${name}`;
  }
}

const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  { type: "function", function: { name: "web_search", description: "Search the web for information.", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
  { type: "function", function: { name: "web_fetch", description: "Fetch URL contents as plain text.", parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
  { type: "function", function: { name: "summarize", description: "Summarise text to a target word count.", parameters: { type: "object", properties: { text: { type: "string" }, target_words: { type: "number" } }, required: ["text"] } } },
  { type: "function", function: { name: "save_note", description: "Save a markdown note to ./notes/.", parameters: { type: "object", properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] } } },
  { type: "function", function: { name: "list_notes", description: "List saved notes.", parameters: { type: "object", properties: {} } } },
];

const SYSTEM_PROMPT = `You are a precise research assistant with access to web search, web fetching, summarisation, and note-saving tools.

Follow the ReAct pattern: think before acting, call tools when needed, incorporate observations.
Rules: cite sources by URL; when saving a note include at least 5 source URLs; when done, stop calling tools.`;

async function runAgent(task: string): Promise<void> {
  console.log(`\n${"=".repeat(70)}\nTask: ${task}`);
  console.log(`Model: ${CHAT_MODEL}${CHEAP_MODEL !== CHAT_MODEL ? ` | small: ${CHEAP_MODEL}` : ""}`);
  console.log(`${"=".repeat(70)}\n`);

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    const cap = capReached();
    if (cap) {
      log("[budget]", `${cap}. Stopping.`);
      break;
    }

    console.log(`\n--- Iteration ${iteration} / ${MAX_ITERATIONS} | Spent: ${spendLabel()} ---`);

    const response = await client.chat.completions.create({
      model: CHAT_MODEL,
      max_tokens: 4096,
      messages,
      tools: TOOL_DEFINITIONS,
    });

    trackUsage(response.usage);

    const message = response.choices[0]?.message;
    if (!message) break;

    if (message.content?.trim()) log("[think]", message.content.trim());

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      log("[done]", `Agent finished. Total: ${spendLabel()}`);
      break;
    }

    // Push the assistant turn verbatim: the tool_call ids inside it are what
    // the tool messages below refer back to.
    messages.push(message);

    for (const toolCall of toolCalls) {
      if (!("function" in toolCall)) continue;
      const { name, arguments: argsJson } = toolCall.function;
      log("[act]", `→ ${name}(${argsJson})`);

      let result: string;
      try {
        result = await dispatchTool(name, JSON.parse(argsJson) as ToolInput);
      } catch (err) {
        result = `tool error: ${err instanceof Error ? err.message : String(err)}`;
      }

      const truncated = result.length > 2_000 ? result.slice(0, 2_000) + "\n…[truncated]" : result;
      log("[observe]", truncated);

      // Every tool call must get a reply, even after a cap is hit — a dangling
      // tool_call id makes the next request malformed. Break *after* the loop.
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: truncated });
    }

    const capAfterTools = capReached();
    if (capAfterTools) {
      log("[budget]", `${capAfterTools}.`);
      break;
    }
  }

  console.log(`\n${"=".repeat(70)}\nAgent stopped. Total: ${spendLabel()}\n${"=".repeat(70)}\n`);
}

const task = process.argv.slice(2).join(" ") || "Research the current state of MCP adoption in 2026 and save a 500-word note with 5 sources.";
runAgent(task).catch((err) => { console.error("Agent error:", explainError(err)); process.exit(1); });
