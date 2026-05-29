/**
 * heal.ts — one-shot self-healing pass.
 *
 * Sends Claude the original failing spec + error output, asks for a corrected
 * TestSpec via the emit_spec tool, re-renders and returns new source.
 */

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { TestSpec } from "./schemas.js";
import { render } from "./render.js";
import type { UsageStats } from "./generate.js";

const MODEL = "claude-sonnet-4-6";
const PRICE_INPUT_PER_M = 3.0;
const PRICE_CACHE_WRITE_PER_M = 3.75;
const PRICE_CACHE_READ_PER_M = 0.3;
const PRICE_OUTPUT_PER_M = 15.0;

function relPath(...parts: string[]): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  return resolve(__dirname, ...parts);
}

function loadSystemPrompt(): string {
  return readFileSync(relPath("..", "prompts", "system.md"), "utf-8");
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

const EMIT_SPEC_TOOL: Anthropic.Tool = {
  name: "emit_spec",
  description: "Emit a corrected Playwright test specification that fixes the reported failures.",
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

export interface HealResult {
  source: string;
  spec: TestSpec;
  usage: UsageStats;
}

export async function heal(originalSource: string, failureOutput: string): Promise<HealResult> {
  const client = new Anthropic();
  const systemText = loadSystemPrompt();

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
    throw new Error("Claude did not call emit_spec during healing. Response:\n" + JSON.stringify(response.content, null, 2));
  }

  const spec = TestSpec.parse(toolUse.input);
  const source = render(spec);
  const usage = calcCost(response.usage);

  return { source, spec, usage };
}
