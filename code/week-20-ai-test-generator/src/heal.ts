/**
 * heal.ts
 *
 * One-shot self-healing pass.
 *
 * When the generated spec fails, this module:
 *   1. Sends Claude the original spec source + the failure output.
 *   2. Asks Claude to return a corrected TestSpec via the emit_spec tool.
 *   3. Re-renders the corrected spec and returns the new source string.
 *
 * Only one healing attempt is made — if it still fails, the caller decides
 * whether to surface the error or bail out.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TestSpec } from "./schemas.js";
import { render } from "./render.js";
import type { UsageStats } from "./generate.js";

const MODEL = "claude-sonnet-4-6";

// Same pricing constants as generate.ts
const PRICE_INPUT_PER_M = 3.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 15.0;

// ── Helpers ───────────────────────────────────────────────────────

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

  return {
    inputTokens,
    outputTokens,
    cacheWriteTokens,
    cacheReadTokens,
    estimatedCostUSD,
  };
}

// ── Tool definition (same as generate.ts) ────────────────────────────

const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description:
    "Emit a corrected Playwright test specification that fixes the reported failures.",
  input_schema: {
    type: "object" as const,
    required: ["title", "url", "steps"],
    properties: {
      title: { type: "string" },
      url: { type: "string" },
      steps: {
        type: "array",
        minItems: 3,
        maxItems: 15,
        items: {
          type: "object",
          required: ["description", "action"],
          properties: {
            description: { type: "string" },
            action: {
              type: "string",
              enum: ["goto", "click", "fill", "press", "expect"],
            },
            selector: { type: "string" },
            value: { type: "string" },
            assertion: {
              type: "string",
              enum: ["visible", "hidden", "haveText", "haveURL"],
            },
            expected: { type: "string" },
          },
        },
      },
      imports: {
        type: "array",
        items: { type: "string" },
        default: [],
      },
    },
  },
};

// ── Main export ────────────────────────────────────────────────────

export interface HealResult {
  /** The healed .spec.ts source string (re-rendered from the corrected TestSpec). */
  source: string;
  /** The corrected TestSpec (post-Zod validation). */
  spec: TestSpec;
  /** Token usage and cost for this healing call. */
  usage: UsageStats;
}

/**
 * Ask Claude to fix a failing spec.
 *
 * @param originalSource  The `.spec.ts` source that was run and failed.
 * @param failureOutput   The combined stdout/stderr from the Playwright run.
 * @returns               The corrected source + spec + usage stats.
 */
export async function heal(
  originalSource: string,
  failureOutput: string,
): Promise<HealResult> {
  const client = new Anthropic();

  const systemText = loadSystemPrompt();

  // The user message gives Claude everything it needs to diagnose the failure
  const userContent = [
    "The following Playwright spec was generated but FAILED when run:",
    "",
    "```typescript",
    originalSource,
    "```",
    "",
    "Failure output from `npx playwright test`:",
    "",
    "```",
    // Trim very long output to avoid token waste
    failureOutput.slice(0, 4000),
    "```",
    "",
    "Diagnose the failures and emit a corrected spec via the emit_spec tool.",
    "Fix the selectors or assertions that caused the failures.",
    "Keep all steps that passed unchanged.",
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    // Cache the system prompt — on the second call it will be a cache hit
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

  // Extract the tool_use block
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(
      "Claude did not call emit_spec during healing. Response:\n" +
        JSON.stringify(response.content, null, 2),
    );
  }

  // Validate corrected spec with Zod
  const spec = TestSpec.parse(toolUse.input);
  const source = render(spec);
  const usage = calcCost(response.usage);

  return { source, spec, usage };
}
