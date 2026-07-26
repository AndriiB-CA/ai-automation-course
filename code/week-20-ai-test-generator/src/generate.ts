/**
 * generate.ts
 *
 * Calls Claude (claude-sonnet-5) with:
 *   • A cached system prompt loaded from prompts/system.md
 *   • A user message containing the a11y snapshot, URL, and optional task
 *   • A tool definition `emit_spec` whose input_schema matches TestSpec
 *
 * Returns a validated TestSpec plus token-usage/cost metadata.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TestSpec } from "./schemas.js";

// ── Constants ───────────────────────────────────────────────────────────────────────────────

const MODEL = "claude-sonnet-5";

// Pricing (USD per million tokens) — update if Anthropic changes pricing
const PRICE_INPUT_PER_M = 3.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 15.0;

// ── Types ─────────────────────────────────────────────────────────────────────────────────

export interface GenerateInput {
  url: string;
  a11ySnapshot: string;
  task?: string;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  estimatedCostUSD: number;
}

export interface GenerateResult {
  spec: TestSpec;
  usage: UsageStats;
}

// ── Helpers ───────────────────────────────────────────────────────────────────────────────

function relPath(...parts: string[]): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, ...parts);
}

function loadSystemPrompt(): string {
  const promptPath = relPath("..", "prompts", "system.md");
  return readFileSync(promptPath, "utf-8");
}

function calcCost(usage: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
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

// ── Tool definition ─────────────────────────────────────────────────────────────────────────────

const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description: "Emit a structured Playwright test specification based on the page analysis.",
  input_schema: {
    type: "object" as const,
    required: ["title", "url", "steps"],
    properties: {
      title: { type: "string", description: "The test() title — describes the user behavior under test." },
      url: { type: "string", description: "The canonical URL being tested." },
      steps: {
        type: "array",
        minItems: 3,
        maxItems: 15,
        description: "Ordered list of test steps (3–15).",
        items: {
          type: "object",
          required: ["description", "action"],
          properties: {
            description: { type: "string" },
            action: { type: "string", enum: ["goto", "click", "fill", "press", "expect"] },
            selector: { type: "string" },
            value: { type: "string" },
            assertion: { type: "string", enum: ["visible", "hidden", "haveText", "haveURL"] },
            expected: { type: "string" },
          },
        },
      },
      imports: { type: "array", items: { type: "string" }, default: [] },
    },
  },
};

// ── Main export ─────────────────────────────────────────────────────────────────────────────────

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const client = new Anthropic();
  const systemText = loadSystemPrompt();

  const userContent = [
    `URL: ${input.url}`,
    input.task ? `Task: ${input.task}` : "",
    "",
    "Accessibility snapshot:",
    "```",
    input.a11ySnapshot,
    "```",
    "",
    "Analyse the page and emit a test spec using the emit_spec tool.",
  ].filter((line) => line !== undefined).join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemText,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    tools: [EMIT_SPEC_TOOL],
    tool_choice: { type: "tool", name: "emit_spec" },
    messages: [{ role: "user", content: userContent }],
  });

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not call the emit_spec tool. Response:\n" + JSON.stringify(response.content, null, 2));
  }

  const spec = TestSpec.parse(toolUse.input);
  const usage = calcCost(response.usage);

  return { spec, usage };
}
