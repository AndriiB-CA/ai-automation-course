/**
 * generate.ts
 *
 * Calls Claude (claude-sonnet-4-6) with:
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

// ── Constants ─────────────────────────────────────────────────────

const MODEL = "claude-sonnet-4-6";

// Pricing (USD per million tokens) — update if Anthropic changes pricing
const PRICE_INPUT_PER_M = 3.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 15.0;

// ── Types ────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────

/** Resolve a path relative to this file (works in both src/ and dist/). */
function relPath(...parts: string[]): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, ...parts);
}

/** Load the cached system prompt text from prompts/system.md. */
function loadSystemPrompt(): string {
  const promptPath = relPath("..", "prompts", "system.md");
  return readFileSync(promptPath, "utf-8");
}

/** Calculate estimated cost from raw usage counters. */
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

  return {
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    estimatedCostUSD,
  };
}

// ── Tool definition ───────────────────────────────────────────────

/**
 * The `emit_spec` tool schema mirrors the TestSpec Zod schema.
 * Claude is required to call this tool to return structured output.
 */
const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description:
    "Emit a structured Playwright test specification based on the page analysis.",
  input_schema: {
    type: "object" as const,
    required: ["title", "url", "steps"],
    properties: {
      title: {
        type: "string",
        description: "The test() title — describes the user behavior under test.",
      },
      url: {
        type: "string",
        description: "The canonical URL being tested.",
      },
      steps: {
        type: "array",
        minItems: 3,
        maxItems: 15,
        description: "Ordered list of test steps (3–15).",
        items: {
          type: "object",
          required: ["description", "action"],
          properties: {
            description: {
              type: "string",
              description: "Human-readable description of the step.",
            },
            action: {
              type: "string",
              enum: ["goto", "click", "fill", "press", "expect"],
              description: "The Playwright action to perform.",
            },
            selector: {
              type: "string",
              description:
                "Selector hint: role[name], testid[id], or text[content].",
            },
            value: {
              type: "string",
              description: "Text to fill, key to press, or URL to navigate to.",
            },
            assertion: {
              type: "string",
              enum: ["visible", "hidden", "haveText", "haveURL"],
              description: "Assertion type for expect steps.",
            },
            expected: {
              type: "string",
              description: "Expected value for assertion steps.",
            },
          },
        },
      },
      imports: {
        type: "array",
        items: { type: "string" },
        description: "Extra ES import lines (usually empty).",
        default: [],
      },
    },
  },
};

// ── Main export ────────────────────────────────────────────────────

/**
 * Generate a validated TestSpec for the given URL/a11y snapshot.
 *
 * The system prompt is sent with `cache_control: { type: "ephemeral" }` so
 * that Anthropic caches it across repeated calls, drastically reducing cost.
 */
export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

  const systemText = loadSystemPrompt();

  // Build the user message
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
  ]
    .filter((line) => line !== undefined)
    .join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Cache the (large) system prompt — cache_control marks the last block
    system: [
      {
        type: "text",
        text: systemText,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        cache_control: { type: "ephemeral" } as any,
      },
    ],
    tools: [EMIT_SPEC_TOOL],
    // Force Claude to call emit_spec — no free-text response needed
    tool_choice: { type: "tool", name: "emit_spec" },
    messages: [{ role: "user", content: userContent }],
  });

  // Extract the tool_use block
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "Claude did not call the emit_spec tool. Response:\n" +
        JSON.stringify(response.content, null, 2),
    );
  }

  // Validate with Zod (throws ZodError with a clear message if invalid)
  const spec = TestSpec.parse(toolUse.input);

  const usage = calcCost(response.usage);

  return { spec, usage };
}
