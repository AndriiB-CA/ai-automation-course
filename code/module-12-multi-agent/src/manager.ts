import type OpenAI from "openai";
import { createClient } from "./llm.js";
import {
  MANAGER_BUDGET_CAP_USD,
  MANAGER_MODEL,
  MANAGER_TOKEN_CAP,
  WORKER_MODEL,
  ZERO_USAGE,
  addUsage,
  budgetExceeded,
  calcCost,
  formatCost,
} from "./models.js";
import { TOOL_DEFINITIONS, getNotes } from "./tools.js";
import { runWorker } from "./worker.js";
import type { UsageStats } from "./models.js";

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

function toolsForWorkerType(workerType: string): OpenAI.Chat.Completions.ChatCompletionTool[] {
  const allowed = WORKER_TOOL_ALLOWLIST[workerType] ?? [];
  return allowed
    .filter((name) => name in TOOL_DEFINITIONS)
    .map((name) => TOOL_DEFINITIONS[name]!);
}

function toolName(tool: OpenAI.Chat.Completions.ChatCompletionTool): string {
  return "function" in tool ? tool.function.name : "(unnamed)";
}

interface SubTask {
  id: number;
  workerType: "research" | "writer";
  task: string;
}

/** Strip ```json fences some models add despite being told not to. */
function stripFences(raw: string): string {
  return raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

async function decomposeGoal(
  goal: string,
  client: OpenAI,
): Promise<{ subtasks: SubTask[]; usage: UsageStats }> {
  const model = MANAGER_MODEL();
  const response = await client.chat.completions.create({
    model,
    max_tokens: 1024,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You are a planning manager. Decompose the user goal into exactly 2–3 sub-tasks. " +
          "Return ONLY valid JSON: an array of objects with keys 'id' (1-based integer), " +
          "'workerType' ('research' or 'writer'), and 'task' (string). No markdown fences.",
      },
      { role: "user", content: `Goal: ${goal}` },
    ],
  });

  const usage = calcCost(
    response.usage?.prompt_tokens ?? 0,
    response.usage?.completion_tokens ?? 0,
  );

  const raw = response.choices[0]?.message?.content ?? "";

  let subtasks: SubTask[];
  try {
    subtasks = JSON.parse(stripFences(raw)) as SubTask[];
    if (!Array.isArray(subtasks) || subtasks.length < 2 || subtasks.length > 3) {
      throw new Error(`Expected 2–3 sub-tasks, got ${Array.isArray(subtasks) ? subtasks.length : "non-array"}`);
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
  client: OpenAI
): Promise<{ report: string; usage: UsageStats }> {
  const context = subtaskResults
    .map((r, i) => `Sub-task ${i + 1}: ${r.task}\nResult: ${r.result}`)
    .join("\n\n");

  const noteSection =
    notes.length > 0
      ? "\n\nSaved notes:\n" + notes.map((n) => `### ${n.title}\n${n.content}`).join("\n\n")
      : "";

  const response = await client.chat.completions.create({
    model: MANAGER_MODEL(),
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content:
          "You are a synthesis manager. Combine the worker outputs into a clear, well-structured final report. " +
          "Use markdown headers. Be concise but complete.",
      },
      {
        role: "user",
        content: `Original goal: ${goal}\n\nWorker outputs:\n${context}${noteSection}\n\nWrite the final synthesised report.`,
      },
    ],
  });

  const usage = calcCost(
    response.usage?.prompt_tokens ?? 0,
    response.usage?.completion_tokens ?? 0,
  );

  const report = (response.choices[0]?.message?.content ?? "").trim();

  return { report, usage };
}

export async function runManager(goal: string): Promise<ManagerResult> {
  const client = createClient();
  let cumulative: UsageStats = { ...ZERO_USAGE };

  console.log(`\n${"=".repeat(70)}`);
  console.log(`[manager] Goal: ${goal}`);
  console.log(`[manager] Manager model: ${MANAGER_MODEL()} | Worker model: ${WORKER_MODEL()}`);
  console.log(`${"=".repeat(70)}\n`);

  const { subtasks, usage: planUsage } = await decomposeGoal(goal, client);
  cumulative = addUsage(cumulative, planUsage);

  console.log(`[manager] Decomposed into ${subtasks.length} sub-tasks:`);
  subtasks.forEach((s) => console.log(`  #${s.id} [${s.workerType}] ${s.task}`));

  const subtaskResults: Array<{ task: string; result: string }> = [];

  for (const subtask of subtasks) {
    // Budget guard before spawning each worker
    const breach = budgetExceeded(cumulative, MANAGER_TOKEN_CAP, MANAGER_BUDGET_CAP_USD);
    if (breach) {
      console.log(`\n[manager:budget] ${breach}. Halting.`);
      break;
    }

    console.log(`\n[manager] Spawning worker #${subtask.id} [${subtask.workerType}]: ${subtask.task}`);

    const allowedTools = toolsForWorkerType(subtask.workerType);
    console.log(`[manager] Tool allowlist for this worker: [${allowedTools.map(toolName).join(", ")}]`);

    const { result, usage: workerUsage } = await runWorker(subtask.task, allowedTools, WORKER_MODEL());
    cumulative = addUsage(cumulative, workerUsage);

    console.log(`[manager] Worker #${subtask.id} done. Cost: ${formatCost(workerUsage)} | Cumulative: ${formatCost(cumulative)}`);
    subtaskResults.push({ task: subtask.task, result });
  }

  console.log(`\n[manager] Synthesising final report…`);
  const { report, usage: synthUsage } = await synthesize(goal, subtaskResults, getNotes(), client);
  cumulative = addUsage(cumulative, synthUsage);

  console.log(`[manager] Done. Total: ${formatCost(cumulative)}`);

  return { report, usage: cumulative };
}
