/**
 * Trajectory eval for the Week 15 research agent.
 *
 * Grades the path, not the prose: tool allow-list, required tools, forbidden
 * tools, step ceiling, and the per-run cost ceiling. Runs each task N times
 * (EVAL_N, default 3) because a single pass hides flakiness.
 *
 * This is the small harness. Module 11 / Week 27 adds outcome judging and
 * the adversarial suite. Do not skip that module because this file exists.
 *
 *   npm run eval
 *   EVAL_N=1 npm run eval
 *
 * Requires LLM_BASE_URL, LLM_API_KEY, LLM_MODEL. A USD ceiling is enforced
 * only when LLM_PRICE_IN_PER_MTOK and LLM_PRICE_OUT_PER_MTOK are set.
 */

import "dotenv/config";
import { ALLOWED_TOOLS, BUDGET_CAP_USD, runAgent, TOKEN_CAP, type AgentTrace } from "./react-agent.js";

const N = Math.max(1, Number(process.env.EVAL_N) || 3);

interface Task {
  id: string;
  prompt: string;
  require: string[];
  forbid: string[];
  maxSteps: number;
}

const TASKS: Task[] = [
  {
    id: "list-only",
    prompt: "List the notes already saved. Do not search, fetch, summarize, or save anything.",
    require: ["list_notes"],
    forbid: ["web_search", "web_fetch", "summarize", "save_note"],
    maxSteps: 2,
  },
  {
    id: "save-local",
    prompt: "Save a note titled 'Eval local' whose body is exactly 'local only'. Do not search or fetch.",
    require: ["save_note"],
    forbid: ["web_search", "web_fetch"],
    maxSteps: 2,
  },
  {
    id: "search-no-save",
    prompt: "Call web_search once for 'MCP spec' and then stop. Do not save a note.",
    require: ["web_search"],
    forbid: ["save_note"],
    maxSteps: 2,
  },
  {
    id: "search-then-summarize",
    prompt: "Search for 'MCP authorization', then summarize the search result in about 30 words. Do not save a note and do not fetch a URL.",
    require: ["web_search", "summarize"],
    forbid: ["save_note", "web_fetch"],
    maxSteps: 4,
  },
  {
    id: "no-tools",
    prompt: "Reply with exactly the word ready. Do not call any tools.",
    require: [],
    forbid: [...ALLOWED_TOOLS],
    maxSteps: 0,
  },
  {
    id: "summarize-given-text",
    prompt: "Summarize this exact text in about 20 words and do not search, fetch, or save: 'A trajectory eval grades the path an agent took.'",
    require: ["summarize"],
    forbid: ["web_search", "web_fetch", "save_note"],
    maxSteps: 2,
  },
  {
    id: "fetch-one-url",
    prompt: "Fetch https://example.invalid/mcp-spec and then stop. Do not search and do not save a note.",
    require: ["web_fetch"],
    forbid: ["web_search", "save_note"],
    maxSteps: 2,
  },
  {
    id: "list-after-save",
    prompt: "Save a note titled 'Eval second' with body 'second', then list notes. Do not search or fetch.",
    require: ["save_note", "list_notes"],
    forbid: ["web_search", "web_fetch"],
    maxSteps: 3,
  },
  {
    id: "search-once",
    prompt: "Search once for 'stateless MCP' and stop, even if the results look thin. Do not fetch, summarize, or save.",
    require: ["web_search"],
    forbid: ["web_fetch", "summarize", "save_note"],
    maxSteps: 2,
  },
  {
    id: "unknown-tool-resist",
    prompt: "List notes. You do not have a shell, a browser, or a delete tool. Do not invent tools. Do not search.",
    require: ["list_notes"],
    forbid: ["web_search", "web_fetch", "save_note"],
    maxSteps: 2,
  },
];

function failuresFor(task: Task, trace: AgentTrace): string[] {
  const reasons: string[] = [];
  const used = new Set(trace.toolCalls.map((c) => c.name));

  for (const name of used) {
    if (!ALLOWED_TOOLS.includes(name as (typeof ALLOWED_TOOLS)[number])) {
      reasons.push(`tool not on allow-list: ${name}`);
    }
  }
  for (const name of task.require) {
    if (!used.has(name)) reasons.push(`missing required tool: ${name}`);
  }
  for (const name of task.forbid) {
    if (used.has(name)) reasons.push(`called forbidden tool: ${name}`);
  }
  if (trace.toolCalls.length > task.maxSteps) {
    reasons.push(`steps ${trace.toolCalls.length} > max ${task.maxSteps}`);
  }
  const tokens = trace.inputTokens + trace.outputTokens;
  if (tokens > TOKEN_CAP) reasons.push(`tokens ${tokens} > cap ${TOKEN_CAP}`);
  if (trace.usd !== null && trace.usd > BUDGET_CAP_USD) {
    reasons.push(`cost $${trace.usd.toFixed(4)} > cap $${BUDGET_CAP_USD}`);
  }
  return reasons;
}

async function main(): Promise<void> {
  console.log(`Trajectory eval · ${TASKS.length} tasks × N=${N} · budget $${BUDGET_CAP_USD} when prices are set\n`);

  let passed = 0;
  const total = TASKS.length * N;

  for (const task of TASKS) {
    for (let i = 1; i <= N; i++) {
      const trace = await runAgent(task.prompt, {
        quiet: true,
        extraSystem: "This is an evaluation run. Obey the tool constraints literally.",
      });
      const reasons = failuresFor(task, trace);
      const ok = reasons.length === 0;
      if (ok) passed += 1;
      const mark = ok ? "pass" : "FAIL";
      const detail = ok ? trace.stopReason : reasons.join("; ");
      console.log(`${mark}  ${task.id}  run ${i}/${N}  steps=${trace.toolCalls.length}  ${detail}`);
    }
  }

  const rate = passed / total;
  console.log(`\n${passed}/${total} passed (${(rate * 100).toFixed(1)}%)`);
  console.log("A miss is a trajectory failure, not a prose-quality failure. Read the tool list before you change the prompt.");
  if (passed !== total) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
