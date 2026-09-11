/**
 * heal.ts — one-shot self-healing pass.
 *
 * Sends the model the original failing spec + error output, asks for a
 * corrected TestSpec via the emit_spec tool, re-renders and returns new source.
 */

import type OpenAI from "openai";
import { createClient, getModel } from "./llm.js";
import { SPEC_PARAMETERS, loadSystemPrompt, parseSpecCall, usageFrom } from "./generate.js";
import { render } from "./render.js";
import { TestSpec } from "./schemas.js";
import type { UsageStats } from "./generate.js";

const EMIT_SPEC_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_spec",
    description: "Emit a corrected Playwright test specification that fixes the reported failures.",
    parameters: SPEC_PARAMETERS as unknown as Record<string, unknown>,
  },
};

export interface HealResult {
  source: string;
  spec: TestSpec;
  usage: UsageStats;
}

export async function heal(originalSource: string, failureOutput: string): Promise<HealResult> {
  const client = createClient();
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

  const spec = parseSpecCall(response, "healing");
  return { source: render(spec), spec, usage: usageFrom(response.usage) };
}
