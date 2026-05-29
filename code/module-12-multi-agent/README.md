# Module 12 — Multi-Agent System with Constrained-Autonomy Guardrails

A manager/worker multi-agent system built with the Anthropic Claude SDK. A manager model decomposes a research goal into 2–3 sub-tasks, spawns specialised worker agents (each with a restricted tool allowlist), then synthesises their outputs into a final report.

## Architecture

```
index.ts  →  manager (claude-opus-4-8)
                ├── research worker (claude-haiku-4-5-20251001)  tools: web_search, web_fetch
                └── writer worker   (claude-haiku-4-5-20251001)  tools: save_note
```

## Setup

```bash
cp .env.example .env
# add your ANTHROPIC_API_KEY to .env
npm install
```

## Run

```bash
npx tsx src/index.ts "What are the main Playwright best practices for handling flaky tests?"
```

## Module 12 Weekend Project Rubric

1. **Tool whitelist** — each worker receives only the tools its task requires; the allowlist is enforced in `src/manager.ts` via `WORKER_TOOL_ALLOWLIST` before worker spawn.
2. **Output validation** — all tool inputs are validated with Zod schemas in `src/tools.ts` before execution; invalid inputs surface as tool errors, not crashes.
3. **HITL (Human-in-the-Loop)** — the manager prints the decomposed sub-task plan before spawning any worker, giving an operator the opportunity to inspect intent (extend with an `--interactive` flag to add a y/n gate).
4. **Audit log** — every tool call, worker iteration, and cost checkpoint is logged to stdout with structured tags (`[manager]`, `[worker:tool]`, `[worker:observe]`, etc.).
5. **Budget cap** — `$0.10` per worker (checked before each API call inside the loop) and `$0.50` cumulative (checked before each worker spawn in the manager).
6. **Model tiering** — the planning/synthesis manager uses `claude-opus-4-8`; all workers use the cheaper `claude-haiku-4-5-20251001`.
7. **Cost delta report** — per-worker cost and cumulative totals are printed at each stage; the final report includes total tokens in/out and USD cost.
