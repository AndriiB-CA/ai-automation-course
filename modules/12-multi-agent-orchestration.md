# Module 12 — Multi-Agent Orchestration & the Claude Agent SDK

**Companion to the Agents phase (Weeks 13–16) · best read during/after Week 15 · ~8 hours**

> 🧭 **Where this fits:** Module 4 taught you single-agent loops and tool use. This module is the 2026 upgrade: systems where multiple agents collaborate under guardrails, built on the SDK that fits a Claude-first stack. This is the single biggest skill gap between a 2025-era curriculum and what the market screens for now.

---

## Why this module matters

In 2026 the bar moved. Calling one LLM in a loop with three tools is table stakes. What companies now want is **multi-agent orchestration with constrained autonomy** — a manager agent that decomposes a goal and delegates to specialized workers, all operating inside guardrails that keep the system auditable and safe. Gartner projects that 40% of enterprise applications will embed task-specific agents by end of 2026, up from under 5% a year earlier, and the agent tooling market is growing at roughly 46% annually. The engineers who can architect these systems — not just call an API — are the scarce, well-paid ones.

## Learning objectives

- Build a manager/worker multi-agent system that completes a task no single agent could
- Use the **Claude Agent SDK** (the natural fit for a Claude-centric stack)
- Apply the **Constrained Autonomy** pattern: tool whitelists, output validation, human-in-the-loop, audit logging
- Know the 2026 framework landscape and pick correctly by workflow shape
- Understand the emerging protocols: MCP, A2A, AGENTS.md
- Control the cost explosion that multi-agent systems cause

---

## Part 1 — The mental shift: orchestration, not just iteration

A single agent is a loop: think → act → observe → repeat. A **multi-agent system** introduces division of labor. The dominant production pattern is **manager/worker** (also called orchestrator/sub-agent):

```
                  ┌─────────────────┐
   user goal ───► │  Manager agent  │  decomposes, delegates, synthesizes
                  └────────┬────────┘
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │ Research │ │ Extract  │ │  Report  │   specialized workers
        │  agent   │ │  agent   │ │  agent   │   each with its own tools + prompt
        └──────────┘ └──────────┘ └──────────┘
```

**Why split at all?** Three reasons that hold up in production:
1. **Focus** — a worker with 3 tools and a tight prompt outperforms one agent juggling 15 tools. Tool confusion is real and grows non-linearly.
2. **Context economy** — each worker sees only what it needs. You don't pay to stuff the whole task history into every call.
3. **Testability** — you can eval each worker in isolation (this is your QA brain's home turf — unit tests vs integration tests).

**When NOT to go multi-agent:** if a single agent with a handful of tools solves it, do that. Multi-agent adds coordination overhead, latency, and cost. The skill is knowing the threshold — reach for multiple agents when the task has genuinely distinct sub-skills (research vs. writing vs. code execution) or when one agent's tool list exceeds ~8–10 tools.

### Reading (90 min)
- Re-read with new eyes: [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents) — focus on the "orchestrator-workers" and "evaluator-optimizer" sections
- [Anthropic — How we built our multi-agent research system](https://www.anthropic.com/engineering/built-multi-agent-research-system) — the canonical real-world writeup
- [Cognition — Don't build multi-agents](https://cognition.ai/blog/dont-build-multi-agents) — read the *counterargument* too. A good engineer knows when single-agent wins.

---

## Part 2 — The Claude Agent SDK

Your course is Claude-centric, so this is your natural agent framework. The **Claude Agent SDK** shipped alongside Claude 4.6 and by 2026 overtook several older frameworks in enterprise production deployments. It gives you the agent loop, tool use, MCP integration, and a memory primitive without hand-rolling everything you built in Module 4.

### Reading + setup (60 min)
- [Claude Agent SDK overview](https://docs.claude.com/en/api/agent-sdk/overview)
- [Claude Agent SDK — TypeScript reference](https://docs.claude.com/en/api/agent-sdk/typescript)
- [Agent SDK — tools & MCP](https://docs.claude.com/en/api/agent-sdk/mcp)

```bash
npm install @anthropic-ai/claude-agent-sdk
```

### What the SDK gives you (and what you still own)
- **Gives you:** the loop, tool dispatch, MCP server connection, streaming, memory, sub-agent spawning
- **You still own:** tool definitions, the guardrails (Part 3), evals (Module 11), and cost caps (Part 5)

> 🧪 **QA bridge:** Think of the SDK as your test runner and the agent loop as the framework — you didn't write Playwright's executor, but you still write the tests, the fixtures, and the assertions. Same division of labor here.

### A note on staying provider-flexible
The SDK couples you to Claude. That's fine for this course and for many production stacks, but in interviews you'll be asked "what if you had to swap models?" Know the alternatives in Part 4 and be ready to articulate the lock-in trade-off.

---

## Part 3 — Constrained Autonomy (the production pattern that matters most)

This is the most important concept in the module. Memorize the term — it comes up in interviews constantly.

**Constrained Autonomy** means giving an agent freedom to reason and plan *within carefully defined guardrails*. An agent that can take any action is a liability; an agent that can only take safe, validated actions is a product. The pattern has four pillars:

1. **Tool whitelisting** — the agent can call exactly these tools and no others. No dynamic tool discovery in production without review. For destructive tools (delete, send, pay), require an explicit higher bar.
2. **Output validation** — every agent action is checked against business rules *before* it executes. The LLM proposes; a deterministic layer disposes. (You already do this with Zod from Week 3 — extend it to actions, not just data.)
3. **Human-in-the-loop (HITL) checkpoints** — at high-risk or irreversible decision points, the agent pauses for human approval. The art is choosing *where*: too many checkpoints and it's not automation; too few and it's dangerous.
4. **Comprehensive audit logging** — every reasoning step, tool call, input, and output is logged for debugging, compliance, and eval. In regulated industries this is non-negotiable.

```
        ┌──────────────────────────────────────────────┐
        │  Agent proposes action                       │
        └───────────────────┬──────────────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │  Is the tool on the whitelist?  ──no──► reject + log
        └───────────────────┬──────────────────────────┘ yes
                            ▼
        ┌──────────────────────────────────────────────┐
        │  Does output pass validation rules? ──no──► reject + retry
        └───────────────────┬──────────────────────────┘ yes
                            ▼
        ┌──────────────────────────────────────────────┐
        │  Is this action high-risk? ──yes──► pause for human approval
        └───────────────────┬──────────────────────────┘ no
                            ▼
                  execute + log everything
```

The design principle that ties it together, drawn from production automation teams: **autonomous execution for the routine, human escalation for the exceptional.** Agents do best on high-volume, low-complexity, predictable tasks; humans stay in the loop for novel or high-stakes decisions.

### 🛡️ Security callout
Constrained Autonomy *is* your security model for agents. Everything in Module 8 (OWASP LLM Top 10) and Module 11 (adversarial evals) plugs into these four pillars. When you red-team in Week 28, you're really testing whether your guardrails hold. Note also that the OWASP Top 10 for Agentic AI (2026) — which you already reference in Week 28 — maps almost one-to-one onto failures of these four pillars (excessive agency = weak whitelisting; etc.).

---

## Part 4 — The 2026 framework landscape (pick by workflow shape)

You don't need to learn all of these. You need to *know* them so you choose well and speak credibly in interviews. The landscape consolidated hard in 2025–2026.

| Framework | Language | Pick it when… |
|---|---|---|
| **Claude Agent SDK** | TS / Python | Claude-first stack; want MCP + memory built in (your default for this course) |
| **LangGraph** | Python / JS | You need durable execution, checkpointing, time-travel debugging, graph-structured control flow. The serious-production default. |
| **Mastra** | TypeScript | TS/Next.js stack, agent lives near the UI. Still the de-facto TS choice in 2026. |
| **OpenAI Agents SDK** | Python / TS | OpenAI-native stack; "handoff" model; lowest friction for OpenAI-only. |
| **CrewAI** | Python | Fast role-based multi-agent prototypes; you want something running in 20 minutes. |
| **Pydantic AI** | Python | Type-safe, validation-first Python services. |
| **Google ADK** | Python | Vertex AI ecosystem; A2A protocol; multimodal. |
| **Microsoft Agent Framework** | .NET / Python | Microsoft/enterprise .NET shops. (Note: AutoGen is now in maintenance; AG2 is the community fork.) |

**The interview-ready summary:** "The choice isn't which framework is best in the abstract — all of these ship production systems in 2026. It's which fits the workflow shape: graph-structured durable execution → LangGraph; TypeScript-native → Mastra; Claude-native with MCP → Claude Agent SDK; OpenAI-only → Agents SDK; fast role-based prototype → CrewAI."

### Emerging protocols to track
- **MCP (Model Context Protocol)** — you already know this from Module 4. The leading standard for tool/context interop. Bet on it.
- **A2A (Agent-to-Agent)** — a protocol for agents built by different teams/vendors to communicate. Watch it; don't invest heavily yet.
- **AGENTS.md** — an emerging convention for a repo-level file that tells coding agents how to work in your codebase (build commands, conventions, test commands). Cheap to adopt; add one to your capstone repo.

---

## Part 5 — Cost engineering for multi-agent systems

Multi-agent systems have a nasty failure mode: **token explosion.** A manager that spawns five workers, each making several LLM calls, each carrying context, can cost 10–15× a single agent run. This is where many prototypes die in production budget review. Bring forward everything from Module 7 and add these agent-specific tactics:

- **Model tiering** — the manager can be a strong model (it makes the hard delegation calls); workers doing narrow, well-specified tasks often run fine on a cheap, fast model. Tier deliberately.
- **Context pruning per worker** — never pass the full conversation to a worker. Pass only its task spec and the minimum context. This is the single biggest lever.
- **Prompt caching on shared prefixes** — workers often share a system prompt or instruction block. Cache it (you learned this in Week 22).
- **Hard budget caps per task** — the orchestrator tracks cumulative spend and halts if it exceeds a ceiling. Fail loudly rather than run up a bill.
- **Parallel vs sequential** — parallel workers are faster but spike concurrent cost and rate limits. Know which your task needs.

> 🧪 **QA bridge:** Treat cost like latency in performance testing — set a budget (p95 cost per task), measure it under load, and gate merges on it in CI. A PR that doubles cost-per-task should fail just like one that doubles latency.

---

## Weekend project (4–5 hours)

**Build a manager/worker research-and-report system** with constrained autonomy.

> 🚀 **Starter code:** [`/code/module-12-multi-agent`](../code/module-12-multi-agent/) — a runnable manager/worker skeleton with per-worker tool whitelists, per-worker and cumulative budget caps, model tiering (strong manager / cheap workers), and an audit log. Clone it, read `src/manager.ts` first, then extend it to meet the rubric below.

Extend your Week 15 research agent into a multi-agent system:
- **Manager agent** — takes a research question, plans sub-tasks, delegates, synthesizes a final report
- **Research worker** — `web_search` + `web_fetch`, returns sourced findings
- **Analysis worker** — summarizes, identifies themes, flags contradictions
- **Writer worker** — produces the final structured report with citations

Requirements (these are the rubric):
- [ ] Built on the Claude Agent SDK (or Mastra if you prefer to compare)
- [ ] **Tool whitelist** enforced per worker (research worker cannot write files; writer cannot search)
- [ ] **Output validation** — final report validated against a Zod schema before it's returned
- [ ] **One HITL checkpoint** — manager pauses for human approval before spawning expensive workers OR before finalizing
- [ ] **Full audit log** — every delegation, tool call, and cost written to a trace (Langfuse from Week 16)
- [ ] **Budget cap** — system halts if cumulative cost exceeds your ceiling (e.g., $0.75/task)
- [ ] **Model tiering** — manager on a strong model, at least one worker on a cheaper one; document the cost delta

Run it on 5 different research questions. Produce a short report: cost per task, where tiering saved money, and one failure mode you found.

### Stretch
- Add an **evaluator worker** (the evaluator-optimizer pattern): it critiques the writer's draft against a rubric and sends it back once for revision. Measure quality lift vs. cost.
- Add an `AGENTS.md` to the repo.

---

## Self-check before moving on

- [ ] You can explain manager/worker and when *not* to use multi-agent
- [ ] You can define Constrained Autonomy and name its four pillars from memory
- [ ] Your system enforces a tool whitelist and a budget cap that actually fires
- [ ] You can pick a framework for a given workflow shape and justify it in two sentences
- [ ] You know what MCP, A2A, and AGENTS.md each are
- [ ] You measured and reduced multi-agent cost with tiering + context pruning

---

## Daily 15-min tasks

- **Mon:** Read one section of the Anthropic multi-agent research writeup
- **Tue:** Run your system with the manager on a cheaper model — where does quality break?
- **Wed:** Tighten one worker's tool list or prompt; re-measure
- **Thu:** Skim one competing framework's quickstart (LangGraph, CrewAI) — note one idea worth stealing
- **Fri:** Open your Langfuse trace; find the most expensive delegation and explain why

---

## ⏭️ Next up
Back to the main sequence — but carry this forward: your **capstone (Week 24)** becomes far stronger if the healer uses a small manager/worker split (one agent locates the broken element, one proposes + validates the fix). And **Module 11 (Agent Evals)** is where you prove these multi-agent systems are reliable.
