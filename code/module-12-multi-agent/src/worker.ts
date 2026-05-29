import Anthropic from "@anthropic-ai/sdk";
import { calcCost, addUsage, WORKER_MODEL } from "./models.js";
import { dispatchTool, type ToolName } from "./tools.js";
import type { UsageStats } from "./models.js";

const MAX_ITERATIONS = 10;
const WORKER_BUDGET_CAP_USD = 0.10;

export interface WorkerResult {
  result: string;
  usage: UsageStats;
}

export async function runWorker(
  task: string,
  tools: Anthropic.Tool[],
  model: string = WORKER_MODEL
): Promise<WorkerResult> {
  const client = new Anthropic();
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: task }];
  let cumulative: UsageStats = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };

  const systemPrompt =
    "You are a focused research worker. Complete the assigned task using the available tools. " +
    "Be concise. When you have enough information, return a final answer without calling more tools.";

  for (let iteration = 1; iteration <= MAX_ITERATIONS; iteration++) {
    // Budget guard inside the loop — checked before each API call
    if (cumulative.estimatedCostUSD >= WORKER_BUDGET_CAP_USD) {
      console.log(`  [worker:budget] Cap $${WORKER_BUDGET_CAP_USD} reached at iteration ${iteration}. Stopping.`);
      return { result: "[budget cap reached — partial result]", usage: cumulative };
    }

    console.log(`  [worker] iteration ${iteration}/${MAX_ITERATIONS} | cost $${cumulative.estimatedCostUSD.toFixed(5)}`);

    const response = await client.messages.create({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      tools,
      messages,
    });

    const turn = calcCost(model, response.usage.input_tokens, response.usage.output_tokens);
    cumulative = addUsage(cumulative, turn);

    const toolUseBlocks: Anthropic.ToolUseBlock[] = [];
    for (const block of response.content) {
      if (block.type === "tool_use") {
        toolUseBlocks.push(block);
      } else if (block.type === "text" && block.text.trim()) {
        console.log(`  [worker:think] ${block.text.slice(0, 120)}${block.text.length > 120 ? "…" : ""}`);
      }
    }

    if (response.stop_reason === "end_turn" || toolUseBlocks.length === 0) {
      const finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { result: finalText || "[no text output]", usage: cumulative };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolCall of toolUseBlocks) {
      console.log(`  [worker:tool] ${toolCall.name}(${JSON.stringify(toolCall.input).slice(0, 80)})`);

      let output: string;
      try {
        output = await dispatchTool(toolCall.name as ToolName, toolCall.input);
      } catch (err) {
        // Surface Zod validation errors and tool errors as tool results, not exceptions
        output = `tool error: ${err instanceof Error ? err.message : String(err)}`;
      }

      const truncated =
        output.length > 3_000 ? output.slice(0, 3_000) + "\n…[truncated]" : output;
      console.log(`  [worker:observe] ${truncated.slice(0, 100)}${truncated.length > 100 ? "…" : ""}`);

      toolResults.push({
        type: "tool_result",
        tool_use_id: toolCall.id,
        content: truncated,
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  return {
    result: "[max iterations reached — partial result]",
    usage: cumulative,
  };
}
