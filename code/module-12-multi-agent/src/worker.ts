import type OpenAI from "openai";
import { createClient } from "./llm.js";
import {
  WORKER_BUDGET_CAP_USD,
  WORKER_MODEL,
  WORKER_TOKEN_CAP,
  ZERO_USAGE,
  addUsage,
  budgetExceeded,
  calcCost,
  formatCost,
} from "./models.js";
import { dispatchTool, type ToolName } from "./tools.js";
import type { UsageStats } from "./models.js";

const MAX_ITERATIONS = 10;

export interface WorkerResult {
  result: string;
  usage: UsageStats;
}

export async function runWorker(
  task: string,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
  model: string = WORKER_MODEL()
): Promise<WorkerResult> {
  const client = createClient();
  const systemPrompt =
    "You are a focused research worker. Complete the assigned task using the available tools. " +
    "Be concise. When you have enough information, return a final answer without calling more tools.";

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: task },
  ];
  let cumulative: UsageStats = { ...ZERO_USAGE };

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // Budget guard inside the loop — checked before each API call
    const breach = budgetExceeded(cumulative, WORKER_TOKEN_CAP, WORKER_BUDGET_CAP_USD);
    if (breach) {
      console.log(`  [worker:budget] ${breach} at iteration ${iteration}. Stopping.`);
      return { result: "[budget cap reached — partial result]", usage: cumulative };
    }

    console.log(`  [worker] iteration ${iteration}/${MAX_ITERATIONS} | ${formatCost(cumulative)}`);

    const response = await client.chat.completions.create({
      model,
      max_tokens: 2048,
      messages,
      // Only the tools the manager allow-listed for this worker type reach here.
      // An empty list means "answer from what you know" — omit the field
      // entirely, because some providers reject `tools: []`.
      ...(tools.length > 0 ? { tools } : {}),
    });

    const usage = response.usage;
    cumulative = addUsage(
      cumulative,
      calcCost(usage?.prompt_tokens ?? 0, usage?.completion_tokens ?? 0),
    );

    const message = response.choices[0]?.message;
    if (!message) {
      return { result: "[no response from model]", usage: cumulative };
    }

    if (message.content?.trim()) {
      console.log(
        `  [worker:think] ${message.content.slice(0, 120)}${message.content.length > 120 ? "…" : ""}`,
      );
    }

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { result: message.content?.trim() || "[no text output]", usage: cumulative };
    }

    // The assistant turn must go back verbatim — the tool_call ids in it are
    // what the follow-up tool messages refer to.
    messages.push(message);

    for (const toolCall of toolCalls) {
      if (!("function" in toolCall)) continue;
      const { name, arguments: argsJson } = toolCall.function;
      console.log(`  [worker:tool] ${name}(${argsJson.slice(0, 80)})`);

      let output: string;
      try {
        // Arguments arrive as a JSON string. Both the parse and the tool's own
        // Zod validation can fail — surface either as a tool result rather than
        // an exception, so the model gets a chance to correct itself.
        output = await dispatchTool(name as ToolName, JSON.parse(argsJson));
      } catch (err) {
        output = `tool error: ${err instanceof Error ? err.message : String(err)}`;
      }

      const truncated =
        output.length > 3_000 ? output.slice(0, 3_000) + "\n…[truncated]" : output;
      console.log(`  [worker:observe] ${truncated.slice(0, 100)}${truncated.length > 100 ? "…" : ""}`);

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: truncated,
      });
    }
  }

  return {
    result: "[max iterations reached — partial result]",
    usage: cumulative,
  };
}
