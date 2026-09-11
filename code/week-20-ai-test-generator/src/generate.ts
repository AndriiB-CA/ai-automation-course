/**
 * generate.ts
 *
 * Calls your configured model with:
 *   • A system prompt loaded from prompts/system.md
 *   • A user message containing the a11y snapshot, URL, and optional task
 *   • A tool definition `emit_spec` whose parameters match TestSpec
 *
 * Returns a validated TestSpec plus token-usage/cost metadata.
 *
 * Provider-neutral: set LLM_BASE_URL / LLM_API_KEY / LLM_MODEL. See PROVIDERS.md.
 */

import type OpenAI from "openai";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createClient, estimateCost, getModel } from "./llm.js";
import { TestSpec } from "./schemas.js";

// ── Types ─────────────────────────────────────────────────────────────────────────────────

export interface GenerateInput {
  url: string;
  a11ySnapshot: string;
  task?: string;
}

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  /** USD, or null when LLM_PRICE_*_PER_MTOK are unset. */
  estimatedCostUSD: number | null;
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

export function loadSystemPrompt(): string {
  const promptPath = relPath("..", "prompts", "system.md");
  return readFileSync(promptPath, "utf-8");
}

export function usageFrom(usage: OpenAI.CompletionUsage | undefined): UsageStats {
  const { inputTokens, outputTokens, usd } = estimateCost(usage);
  return { inputTokens, outputTokens, estimatedCostUSD: usd };
}

// ── Tool definition ─────────────────────────────────────────────────────────────────────────────

/** Shared between generation and healing — same output shape, different framing. */
export const SPEC_PARAMETERS = {
  type: "object",
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
} as const;

const EMIT_SPEC_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_spec",
    description: "Emit a structured Playwright test specification based on the page analysis.",
    parameters: SPEC_PARAMETERS as unknown as Record<string, unknown>,
  },
};

/**
 * Pull the emit_spec arguments out of a completion and validate them.
 *
 * `minItems`/`maxItems` in the tool schema are a *hint* — several providers
 * don't enforce them. TestSpec.parse is what actually enforces them, which is
 * why it runs on every response rather than only when something looks wrong.
 */
export function parseSpecCall(
  completion: OpenAI.Chat.Completions.ChatCompletion,
  context: string,
): TestSpec {
  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || !("function" in call)) {
    throw new Error(
      `Model did not call emit_spec during ${context}. Response:\n` +
        JSON.stringify(completion.choices[0]?.message, null, 2),
    );
  }
  return TestSpec.parse(JSON.parse(call.function.arguments));
}

// ── Main export ─────────────────────────────────────────────────────────────────────────────────

export async function generate(input: GenerateInput): Promise<GenerateResult> {
  const client = createClient();
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

  const response = await client.chat.completions.create({
    model: getModel(),
    max_tokens: 2048,
    temperature: 0,
    messages: [
      { role: "system", content: systemText },
      { role: "user", content: userContent },
    ],
    tools: [EMIT_SPEC_TOOL],
    tool_choice: { type: "function", function: { name: "emit_spec" } },
  });

  return { spec: parseSpecCall(response, "generation"), usage: usageFrom(response.usage) };
}
