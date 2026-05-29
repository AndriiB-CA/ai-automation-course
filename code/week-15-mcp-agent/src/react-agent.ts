/**
 * ReAct-style multi-tool research agent
 *
 * Loop: build messages → call Claude → execute tool_use blocks → feed results
 *       back → repeat until a final text answer or max 15 iterations.
 *
 * Budget cap: stops when estimated cost exceeds $0.50.
 *   Pricing (per million tokens): Sonnet $3 in / $15 out, Haiku $1 in / $5 out.
 *
 * Usage:
 *   npm run agent
 *   npm run agent -- "Your custom task here"
 */

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const CHAT_MODEL = "claude-sonnet-4-6";
const CHEAP_MODEL = "claude-haiku-4-5-20251001";

const MAX_ITERATIONS = 15;
const BUDGET_CAP_USD = 0.5;

const PRICING = {
  [CHAT_MODEL]: { input: 3.0, output: 15.0 },
  [CHEAP_MODEL]: { input: 1.0, output: 5.0 },
} as const;

const NOTES_DIR = resolve(process.cwd(), "notes");

const anthropic = new Anthropic();

interface TokenUsage { model: string; inputTokens: number; outputTokens: number; }

let totalCostUsd = 0;

function trackCost(usage: TokenUsage): void {
  const prices = PRICING[usage.model as keyof typeof PRICING] ?? { input: 3, output: 15 };
  totalCostUsd += (usage.inputTokens / 1_000_000) * prices.input + (usage.outputTokens / 1_000_000) * prices.output;
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
  const response = await anthropic.messages.create({
    model: CHEAP_MODEL,
    max_tokens: Math.min(target_words * 2, 2048),
    messages: [{ role: "user", content: `Summarise the following text in approximately ${target_words} words. Be concise and factual.\n\n${text}` }],
  });
  trackCost({ model: CHEAP_MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens });
  const block = response.content[0];
  return block.type === "text" ? block.text : "";
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

const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  { name: "web_search", description: "Search the web for information.", input_schema: { type: "object" as const, properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "web_fetch", description: "Fetch URL contents as plain text.", input_schema: { type: "object" as const, properties: { url: { type: "string" } }, required: ["url"] } },
  { name: "summarize", description: "Summarise text to a target word count.", input_schema: { type: "object" as const, properties: { text: { type: "string" }, target_words: { type: "number" } }, required: ["text"] } },
  { name: "save_note", description: "Save a markdown note to ./notes/.", input_schema: { type: "object" as const, properties: { title: { type: "string" }, content: { type: "string" } }, required: ["title", "content"] } },
  { name: "list_notes", description: "List saved notes.", input_schema: { type: "object" as const, properties: {} } },
];

const SYSTEM_PROMPT = `You are a precise research assistant with access to web search, web fetching, summarisation, and note-saving tools.

Follow the ReAct pattern: think before acting, call tools when needed, incorporate observations.
Rules: cite sources by URL; when saving a note include at least 5 source URLs; when done, stop calling tools.`;

async function runAgent(task: string): Promise<void> {
  console.log(`\n${"=".repeat(70)}\nTask: ${task}\n${"=".repeat(70)}\n`);

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    if (totalCostUsd >= BUDGET_CAP_USD) {
      log("[budget]", `Cap reached: $${totalCostUsd.toFixed(4)}. Stopping.`);
      break;
    }

    console.log(`\n--- Iteration ${iteration} / ${MAX_ITERATIONS} | Cost so far: $${totalCostUsd.toFixed(4)} ---`);

    const response = await anthropic.messages.create({
      model: CHAT_MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    trackCost({ model: CHAT_MODEL, inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens });

    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") toolUseBlocks.push(block);
      else if (block.type === "text" && block.text.trim()) log("[think]", block.text.trim());
    }

    if (toolUseBlocks.length === 0 && response.stop_reason === "end_turn") {
      log("[done]", `Agent finished. Total cost: $${totalCostUsd.toFixed(4)}`);
      break;
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolCall of toolUseBlocks) {
      log("[act]", `→ ${toolCall.name}(${JSON.stringify(toolCall.input)})`);
      const result = await dispatchTool(toolCall.name, toolCall.input as ToolInput);
      const truncated = result.length > 2_000 ? result.slice(0, 2_000) + "\n…[truncated]" : result;
      log("[observe]", truncated);
      toolResults.push({ type: "tool_result", tool_use_id: toolCall.id, content: result });
      if (totalCostUsd >= BUDGET_CAP_USD) { log("[budget]", `Cap hit: $${totalCostUsd.toFixed(4)}.`); break; }
    }

    messages.push({ role: "user", content: toolResults });
    if (totalCostUsd >= BUDGET_CAP_USD) break;
  }

  console.log(`\n${"=".repeat(70)}\nAgent stopped. Total cost: $${totalCostUsd.toFixed(4)}\n${"=".repeat(70)}\n`);
}

const task = process.argv.slice(2).join(" ") || "Research the current state of MCP adoption in 2026 and save a 500-word note with 5 sources.";
runAgent(task).catch((err) => { console.error("Agent error:", err); process.exit(1); });
