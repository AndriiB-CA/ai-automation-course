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
 *
 * `runAgent` is exported so `npm run eval` can grade trajectories without
 * starting a second copy of the loop. See trajectory-eval.ts.
 */

import "dotenv/config";
import { pathToFileURL } from "node:url";
import type OpenAI from "openai";
import { writeFileSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createClient, estimateCost, explainError, getModel, getSmallModel } from "./llm.js";

const MAX_ITERATIONS = 15;

/** Always-available ceiling: every provider reports token counts. */
export const TOKEN_CAP = 120_000;
/** Extra ceiling, only enforceable once .env knows what tokens cost. */
export const BUDGET_CAP_USD = Number(process.env.BUDGET_CAP_USD) || 0.5;

const NOTES_DIR = resolve(process.cwd(), "notes");

/** The only tools this agent is allowed to call. The trajectory eval asserts on this list. */
export const ALLOWED_TOOLS = ["web_search", "web_fetch", "summarize", "save_note", "list_notes"] as const;
export type AllowedTool = (typeof ALLOWED_TOOLS)[number];

export interface AgentTrace {
  task: string;
  toolCalls: { name: string; args: string }[];
  iterations: number;
  inputTokens: number;
  outputTokens: number;
  usd: number | null;
  stopReason: string;
  finalText: string;
}

type Bucket = { input: number; output: number };

let client: OpenAI | undefined;
function llm(): OpenAI {
  if (!client) client = createClient();
  return client;
}

function addUsage(bucket: Bucket, usage: OpenAI.CompletionUsage | undefined): void {
  bucket.input += usage?.prompt_tokens ?? 0;
  bucket.output += usage?.completion_tokens ?? 0;
}

function costUsd(bucket: Bucket): number | null {
  return estimateCost({
    prompt_tokens: bucket.input,
    completion_tokens: bucket.output,
  }).usd;
}

function spendLabel(bucket: Bucket): string {
  const usd = costUsd(bucket);
  const tokens = (bucket.input + bucket.output).toLocaleString();
  return usd === null ? `${tokens} tok` : `$${usd.toFixed(4)} (${tokens} tok)`;
}

function capReached(bucket: Bucket): string | null {
  const tokens = bucket.input + bucket.output;
  if (tokens >= TOKEN_CAP) return `token cap ${TOKEN_CAP.toLocaleString()} reached`;
  const usd = costUsd(bucket);
  if (usd !== null && usd >= BUDGET_CAP_USD) return `budget cap $${BUDGET_CAP_USD} reached`;
  return null;
}

async function web_search(query: string): Promise<string> {
  // Local stand-in so the loop runs without a search API key. The text is
  // obviously fake — do not treat anything in it as a fact about MCP.
  const results = [
    {
      title: "Mock result A",
      url: "https://example.invalid/mcp-overview",
      snippet: "Placeholder snippet from the local mock. Replace web_search with a real search tool when you leave the starter.",
    },
    {
      title: "Mock result B",
      url: "https://example.invalid/mcp-spec",
      snippet: "Placeholder snippet. The live spec is at modelcontextprotocol.io — this tool does not fetch it.",
    },
    {
      title: "Mock result C",
      url: "https://example.invalid/mcp-security",
      snippet: "Placeholder snippet about reading the authorization section before exposing a remote server.",
    },
  ].map((r) => `[${r.title}](${r.url})\n${r.snippet}`);
  return `Search results for "${query}" (local mock, not a live web search):\n\n` + results.join("\n\n---\n\n");
}

async function web_fetch(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "week-15-mcp-agent/0.1" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return `HTTP ${response.status}: ${response.statusText}`;
    const html = await response.text();
    const text = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim();
    return text.length > 8_000 ? text.slice(0, 8_000) + "\n…[truncated]" : text;
  } catch (err) {
    return `fetch error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

async function summarize(text: string, target_words: number, bucket: Bucket): Promise<string> {
  // Summarising is a narrow, high-volume step. Use the small model — Module 7.
  const response = await llm().chat.completions.create({
    model: getSmallModel(),
    max_tokens: Math.min(target_words * 2, 2048),
    messages: [
      {
        role: "user",
        content: `Summarise the following text in approximately ${target_words} words. Be concise and factual.\n\n${text}`,
      },
    ],
  });
  addUsage(bucket, response.usage);
  return response.choices[0]?.message?.content ?? "";
}

function save_note(title: string, content: string): string {
  mkdirSync(NOTES_DIR, { recursive: true });
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const filePath = join(NOTES_DIR, `${slug || "note"}.md`);
  writeFileSync(filePath, `# ${title}\n\n${content}\n`, "utf8");
  return `Note saved to ${filePath}`;
}

function list_notes(): string {
  try {
    mkdirSync(NOTES_DIR, { recursive: true });
    const files = readdirSync(NOTES_DIR).filter((f) => f.endsWith(".md"));
    if (files.length === 0) return "No notes saved yet.";
    return files
      .map((f) => {
        const raw = readFileSync(join(NOTES_DIR, f), "utf8");
        const firstLine = raw.split("\n")[0]?.replace(/^#+\s*/, "") ?? f;
        return `• ${f} — ${firstLine}`;
      })
      .join("\n");
  } catch {
    return "notes directory not found";
  }
}

type ToolInput = Record<string, unknown>;

async function dispatchTool(name: string, input: ToolInput, bucket: Bucket): Promise<string> {
  switch (name) {
    case "web_search":
      return web_search(String(input.query ?? ""));
    case "web_fetch":
      return web_fetch(String(input.url ?? ""));
    case "summarize":
      return summarize(String(input.text ?? ""), Number(input.target_words ?? 150), bucket);
    case "save_note":
      return save_note(String(input.title ?? ""), String(input.content ?? ""));
    case "list_notes":
      return list_notes();
    default:
      return `Unknown tool: ${name}`;
  }
}

const TOOL_DEFINITIONS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web for information. In this starter the results are a local mock.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "web_fetch",
      description: "Fetch URL contents as plain text.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    },
  },
  {
    type: "function",
    function: {
      name: "summarize",
      description: "Summarise text to a target word count.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" }, target_words: { type: "number" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "save_note",
      description: "Save a markdown note to ./notes/.",
      parameters: {
        type: "object",
        properties: { title: { type: "string" }, content: { type: "string" } },
        required: ["title", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_notes",
      description: "List saved notes.",
      parameters: { type: "object", properties: {} },
    },
  },
];

const SYSTEM_PROMPT = `You are a precise research assistant. You may call only these tools: ${ALLOWED_TOOLS.join(", ")}.

Follow the user's constraints exactly. If they forbid a tool, do not call it. Prefer the smallest set of tool calls that satisfies the request.
When you search, remember the starter's web_search is a local mock — say so if you cite it.
When you are done, stop calling tools and answer in plain text.`;

export async function runAgent(task: string, opts?: { quiet?: boolean; extraSystem?: string }): Promise<AgentTrace> {
  const quiet = opts?.quiet ?? false;
  const log = (tag: string, msg: string) => {
    if (!quiet) console.log(`${tag} ${msg}`);
  };

  const chatModel = getModel();
  const smallModel = getSmallModel();
  const bucket: Bucket = { input: 0, output: 0 };
  const toolCalls: AgentTrace["toolCalls"] = [];
  let iterations = 0;
  let stopReason = "max iterations";
  let finalText = "";

  if (!quiet) {
    console.log(`\n${"=".repeat(70)}\nTask: ${task}`);
    console.log(`Model: ${chatModel}${smallModel !== chatModel ? ` | small: ${smallModel}` : ""}`);
    console.log(`${"=".repeat(70)}\n`);
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT + (opts?.extraSystem ? `\n\n${opts.extraSystem}` : "") },
    { role: "user", content: task },
  ];

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    iterations = iteration;
    const cap = capReached(bucket);
    if (cap) {
      stopReason = cap;
      log("[budget]", `${cap}. Stopping.`);
      break;
    }

    if (!quiet) console.log(`\n--- Iteration ${iteration} / ${MAX_ITERATIONS} | Spent: ${spendLabel(bucket)} ---`);

    const response = await llm().chat.completions.create({
      model: chatModel,
      max_tokens: 4096,
      messages,
      tools: TOOL_DEFINITIONS,
    });

    addUsage(bucket, response.usage);

    const message = response.choices[0]?.message;
    if (!message) {
      stopReason = "empty response";
      break;
    }

    if (message.content?.trim()) {
      finalText = message.content.trim();
      log("[think]", finalText);
    }

    const calls = message.tool_calls ?? [];
    if (calls.length === 0) {
      stopReason = "final answer";
      log("[done]", `Agent finished. Total: ${spendLabel(bucket)}`);
      break;
    }

    messages.push(message);

    for (const toolCall of calls) {
      if (!("function" in toolCall)) continue;
      const { name, arguments: argsJson } = toolCall.function;
      toolCalls.push({ name, args: argsJson });
      log("[act]", `→ ${name}(${argsJson})`);

      let result: string;
      try {
        result = await dispatchTool(name, JSON.parse(argsJson) as ToolInput, bucket);
      } catch (err) {
        result = `tool error: ${err instanceof Error ? err.message : String(err)}`;
      }

      const truncated = result.length > 2_000 ? result.slice(0, 2_000) + "\n…[truncated]" : result;
      log("[observe]", truncated);
      messages.push({ role: "tool", tool_call_id: toolCall.id, content: truncated });
    }

    const capAfter = capReached(bucket);
    if (capAfter) {
      stopReason = capAfter;
      log("[budget]", `${capAfter}.`);
      break;
    }
  }

  if (!quiet) {
    console.log(`\n${"=".repeat(70)}\nAgent stopped. Total: ${spendLabel(bucket)}\n${"=".repeat(70)}\n`);
  }

  return {
    task,
    toolCalls,
    iterations,
    inputTokens: bucket.input,
    outputTokens: bucket.output,
    usd: costUsd(bucket),
    stopReason,
    finalText,
  };
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const task =
    process.argv.slice(2).join(" ") ||
    "Research the current state of MCP and save a short note. Say clearly that web_search in this starter is a local mock.";
  runAgent(task).catch((err) => {
    console.error("Agent error:", explainError(err));
    process.exit(1);
  });
}
