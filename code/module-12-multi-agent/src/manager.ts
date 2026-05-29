import Anthropic from "@anthropic-ai/sdk";
import { MANAGER_MODEL, WORKER_MODEL, calcCost, addUsage } from "./models.js";
import { TOOL_DEFINITIONS, getNotes } from "./tools.js";
import { runWorker } from "./worker.js";
import type { UsageStats } from "./models.js";

const MANAGER_BUDGET_CAP_USD = 0.50;

export interface ManagerResult {
  report: string;
  usage: UsageStats;
}

// Worker types and their allowed tools.
// Each worker type receives ONLY the tools on this list — this is the
// constrained-autonomy enforcement point. Expanding a worker's capabilities
// requires an explicit change here, making the allow-list auditable.
const WORKER_TOOL_ALLOWLIST: Record<string, string[]> = {
  research: ["web_search", "web_fetch"],
  writer: ["save_note"],
};

function toolsForWorkerType(workerType: string): Anthropic.Tool[] {
  const allowed = WORKER_TOOL_ALLOWLIST[workerType] ?? [];
  return allowed
    .filter((name) => name in TOOL_DEFINITIONS)
    .map((name) => TOOL_DEFINITIONS[name]);
}

interface SubTask {
  id: number;
  workerType: "research" | "writer";
  task: string;
}

async function decomposeGoal(goal: string, client: Anthropic): Promise<{ subtasks: SubTask[]; usage: UsageStats }> {
  const response = await client.messages.create({
    model: MANAGER_MODEL,
    max_tokens: 1024,
    system:
      "You are a planning manager. Decompose the user goal into exactly 2–3 sub-tasks. " +
      "Return ONLY valid JSON: an array of objects with keys 'id' (1-based integer), " +
      "'workerType' ('research' or 'writer'), and 'task' (string). No markdown fences.",
    messages: [{ role: "user", content: `Goal: ${goal}` }],
  });

  const usage = calcCost(
    MANAGER_MODEL,
    response.usage.input_tokens,
    response.usage.output_tokens
  );

  const raw = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");

  let subtasks: SubTask[];
  try {
    subtasks = JSON.parse(raw) as SubTask[];
    if (!Array.isArray(subtasks) || subtasks.length < 2 || subtasks.length > 3) {
      throw new Error(`Expected 2–3 sub-tasks, got ${subtasks.length}`);
    }
  } catch (err) {
    throw new Error(`Manager failed to decompose goal: ${err instanceof Error ? err.message : String(err)}\nRaw response: ${raw}`);
  }

  return { subtasks, usage };
}

async function synthesize(
  goal: string,
  subtaskResults: Array<{ task: string; result: string }>,
  notes: Array<{ title: string; content: string }>,
  client: Anthropic
): Promise<{ report: string; usage: UsageStats }> {
  const context = subtaskResults
    .map((r, i) => `Sub-task ${i + 1}: ${r.task}\nResult: ${r.result}`)
    .join("\n\n");

  const noteSection =
    notes.length > 0
      ? "\n\nSaved notes:\n" + notes.map((n) => `### ${n.title}\n${n.content}`).join("\n\n")
      : "";

  const response = await client.messages.create({
    model: MANAGER_MODEL,
    max_tokens: 2048,
    system:
      "You are a synthesis manager. Combine the worker outputs into a clear, well-structured final report. " +
      "Use markdown headers. Be concise but complete.",
    messages: [
      {
        role: "user",
        content: `Original goal: ${goal}\n\nWorker outputs:\n${context}${noteSection}\n\nWrite the final synthesised report.`,
      },
    ],
  });

  const usage = calcCost(
    MANAGER_MODEL,
    response.usage.input_tokens,
    response.usage.output_tokens
  );

  const report = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  return { report, usage };
}

export async function runManager(goal: string): Promise<ManagerResult> {
  const client = new Anthropic();
  let cumulative: UsageStats = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: 0 };

  console.log(`\n${"=".repeat(70)}`);
  console.log(`[manager] Goal: ${goal}`);
  console.log(`${"=".repeat(70)}\n`);

  const { subtasks, usage: planUsage } = await decomposeGoal(goal, client);
  cumulative = addUsage(cumulative, planUsage);

  console.log(`[manager] Decomposed into ${subtasks.length} sub-tasks:`);
  subtasks.forEach((s) => console.log(`  #${s.id} [${s.workerType}] ${s.task}`));

  const subtaskResults: Array<{ task: string; result: string }> = [];

  for (const subtask of subtasks) {
    // Budget guard before spawning each worker
    if (cumulative.estimatedCostUSD >= MANAGER_BUDGET_CAP_USD) {
      console.log(`\n[manager:budget] Cumulative cost $${cumulative.estimatedCostUSD.toFixed(4)} exceeds cap $${MANAGER_BUDGET_CAP_USD}. Halting.`);
      break;
    }

    console.log(`\n[manager] Spawning worker #${subtask.id} [${subtask.workerType}]: ${subtask.task}`);

    const allowedTools = toolsForWorkerType(subtask.workerType);
    console.log(`[manager] Tool allowlist for this worker: [${allowedTools.map((t) => t.name).join(", ")}]`);

    const { result, usage: workerUsage } = await runWorker(subtask.task, allowedTools, WORKER_MODEL);
    cumulative = addUsage(cumulative, workerUsage);

    console.log(`[manager] Worker #${subtask.id} done. Cost: $${workerUsage.estimatedCostUSD.toFixed(5)} | Cumulative: $${cumulative.estimatedCostUSD.toFixed(5)}`);
    subtaskResults.push({ task: subtask.task, result });
  }

  console.log(`\n[manager] Synthesising final report…`);
  const { report, usage: synthUsage } = await synthesize(goal, subtaskResults, getNotes(), client);
  cumulative = addUsage(cumulative, synthUsage);

  console.log(`[manager] Done. Total cost: $${cumulative.estimatedCostUSD.toFixed(5)}`);

  return { report, usage: cumulative };
}
