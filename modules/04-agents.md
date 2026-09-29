# Module 4 — Agents & Model Context Protocol

**Weeks 13–16 · Phase 2: Build · ~24 hours total**

---

## Why this module matters

Chatbots answer questions. **Agents do things.** The difference is tool use + iteration + memory. Companies in 2026 want engineers who can ship agents that reliably complete multi-step tasks — and **MCP (Model Context Protocol)** is the open standard that's making that portable across tools, clients, and providers.

## Learning objectives

- Distinguish ReAct, Plan-and-Execute, and Reflexion agent patterns
- Build a multi-tool agent from scratch in <200 lines
- Write an MCP server exposing custom tools
- Wire a production-quality agent to tracing + cost monitoring
- Know the agent failure modes (infinite loops, hallucinated tool calls, runaway cost)

---

## Week 13 — Agent Architectures

### The three patterns you must know

**ReAct** (Reason + Act)
- Loop: think → act → observe → think → …
- Simplest pattern. 80% of real agents are this.
- Fails on: very long horizons, tasks requiring planning

**Plan-and-Execute**
- Step 1: LLM plans all steps upfront
- Step 2: Execute each step (possibly with a different, cheaper model)
- Good for: complex multi-step tasks where planning matters
- Fails on: tasks that need replanning mid-flight

**Reflexion / Self-critique**
- After each attempt, LLM critiques its own output
- Iterate: attempt → critique → retry
- Good for: writing, debugging, code generation
- Cost: usually 2–3× more tokens per task

### Reading (2 hours)
- ⭐ [Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents) — the definitive guide
- [ReAct paper](https://arxiv.org/abs/2210.03629) (abstract + section 2)
- [Plan-and-Solve paper](https://arxiv.org/abs/2305.04091) (abstract + examples)

### Video (45 min)
- 🎥 [Agentic Design Patterns — Andrew Ng](https://www.youtube.com/watch?v=sal78ACtGTc)

### Weekend project (3 hours)

**Build:** A minimal ReAct agent in plain TypeScript, **< 200 lines of code**, **no framework**.

Requirements:
- Takes a natural-language task
- Has 3 tools: `calculator`, `current_time`, `search_web` (mock with a hardcoded response)
- Loops until LLM produces a final answer, or 10 iterations max
- Prints each thought/action/observation to the console
- Tracks total tokens + cost

This exercise teaches you **exactly what frameworks hide**. You'll understand LangGraph far better after writing one manually.

Starter in [`/code/week-15-mcp-agent/react-agent.ts`](../code/week-15-mcp-agent/).

---

## Week 14 — Model Context Protocol (MCP) 🔌

### What MCP is, in one sentence
**MCP is USB for AI tools** — a standard protocol so any client (Claude Desktop, Cursor, Windsurf, Zed, VS Code, your own app) can talk to any tool server, regardless of which model is behind it.

Before MCP, every AI client had its own tool plugin system. You wrote the same tool 5 times for 5 different products. With MCP, you write it once, it runs everywhere.

**MCP is the default way to give an agent tools.** It originated at Anthropic. The spec is stewarded by the Agentic AI Foundation under the Linux Foundation, which took it in December 2025. OpenAI, Google, and Microsoft ship clients. It is model-agnostic, which is why a provider-neutral course teaches it as the integration layer.

Public server counts and "percent of enterprises" move fast and get mis-quoted. When you need a number, read the registry and cite it. Do not memorize one from this page.

### Reading (2 hours)
- ⭐ [Model Context Protocol — official docs](https://modelcontextprotocol.io/)
- [MCP specification](https://modelcontextprotocol.io/specification) — skim, reference later
- [Anthropic's MCP intro post](https://www.anthropic.com/news/model-context-protocol)
- Browse: [Official MCP servers](https://github.com/modelcontextprotocol/servers) — GitHub, Slack, Postgres, filesystem, …

### Video (30 min)
- 🎥 [MCP Explained — Anthropic](https://www.youtube.com/watch?v=7j1t3UZA1TY)

### Weekend project (4 hours)

**Build:** Your own MCP server.

Option A (recommended for your track): **Test-Run MCP server**
- Tool: `run_playwright_test(test_file: string) → result` — executes a spec file, returns pass/fail + stderr
- Tool: `list_failing_tests(report_path: string) → string[]`
- Tool: `get_test_source(test_name: string) → string`

Option B: **Your repo MCP server**
- Tool: `list_files(path: string) → string[]`
- Tool: `read_file(path: string) → string`
- Tool: `search_files(pattern: string) → SearchResult[]`
- Tool: `git_log(n: number) → Commit[]`

Use the official [TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk):
```bash
npm install @modelcontextprotocol/sdk
```

### Wire it to an MCP client
Every MCP host keeps a server list in its own config file, but they share this JSON shape. Claude Desktop uses `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS; Cursor, Windsurf, Zed and the VS Code extensions each document their own path. Pick whichever you already have installed:
```json
{
  "mcpServers": {
    "my-test-runner": {
      "command": "node",
      "args": ["/absolute/path/to/your/server.js"]
    }
  }
}
```

Restart the client. Your tools appear automatically. **Moment of magic:** ask it "what tests are failing in my project?" and watch it call your tool.

### 🛡️ Security critical
MCP servers run with *your* permissions. If an LLM can call your `run_shell_command` tool, a prompt injection from a web page could exfiltrate files. Rules:
- Every tool input validated
- Every tool has a scope (`read_only`, `restricted_paths`, etc.)
- Destructive operations require explicit confirmation
- Log every tool invocation with full inputs
- Never wire an MCP server to production until you've read the current spec's security and authorization sections: [2026-07-28 authorization](https://modelcontextprotocol.io/specification/2026-07-28/basic/authorization)

### Two transports, on purpose

The weekend project is **stdio**: your client spawns a process, the server runs as you, and nothing is listening on a port. That is the right first server.

The spec dated **2026-07-28** is the shape for a server other people call. Streamable HTTP is stateless: no protocol session id, one self-contained request per call. Clients send `Mcp-Method` and, for tool calls, `Mcp-Name`, so a gateway can route and rate-limit without parsing the JSON body. Remote auth is OAuth 2.1 with the token audience bound to that server. Dynamic client registration is deprecated. The write-up of the change is the [2026-07-28 spec post](https://blog.modelcontextprotocol.io/posts/2026-07-28/).

| | stdio | stateless Streamable HTTP |
|---|---|---|
| Who can call it | The user who launched the process | Anyone who can reach the URL |
| Auth | The OS user. Keep secrets in the environment. | OAuth 2.1, audience-bound tokens |
| This course | Week 14 project | Read it now. Build it when the server leaves your laptop. |

The starter SDK speaks the current `registerTool` API. Re-check [VERSIONS.md](../VERSIONS.md) before you bump it on your own — the protocol moved in 2026, and an old tutorial's `server.tool(...)` sample is the thing that breaks.

---

## Week 15 — Multi-Tool Agents in Production

### Pick one framework (TypeScript-first)
- **Mastra v1.0** — TypeScript-native, MCP-aware, 22k+ GitHub stars, 1.8M monthly downloads, used by PayPal/Adobe/Docker. Its `Workflow` primitive maps cleanly to test orchestration. **Recommended for this track.**
- **OpenAI Agents SDK** — lightweight and provider-agnostic: it accepts any OpenAI-compatible base URL, so it works with the provider you already configured. Built-in handoffs, guardrails, tracing. Good second choice.
- **Vercel AI SDK** — lowest-level, most explicit. Good if you want maximum control.
- **LangGraph.js** — complex stateful workflows; best for intricate multi-agent pipelines.
- **Vendor-native agent SDKs** — most labs now ship one (Anthropic's Claude Agent SDK, Google's ADK, and others). They expose that vendor's newest capabilities first and give up portability in exchange. Reach for one when you have *decided* on a vendor, not before.

For your QA track, I recommend **Mastra** — its `Workflow` primitive maps cleanly to test orchestration.

### Reading (90 min)
- [Mastra v1.0 docs — Getting Started](https://mastra.ai/docs/getting-started/installation)
- [Mastra Agents & Tools](https://mastra.ai/docs/agents/overview)
- Browse: [Mastra examples](https://github.com/mastra-ai/mastra/tree/main/examples)
- [Building agents with a vendor SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) — read for the architecture, not the API surface

### Weekend project (5 hours)

**Build:** A "research agent" with:
- 5 tools:
  - `web_search(query: string)` → uses Tavily or SerpAPI
  - `web_fetch(url: string)` → extracts text
  - `summarize(text: string, target_words: number)`
  - `save_note(title: string, content: string)` → writes to a local markdown file
  - `list_notes()`
- Persistent memory between runs (local JSON or SQLite)
- Streaming output to the console with `think|act|observe` tags
- Retry with backoff on tool errors
- **Budget cap**: stops if cost exceeds the ceiling in `BUDGET_CAP_USD` (the starter defaults to `0.50`, and the ceiling only becomes dollars once `LLM_PRICE_*_PER_MTOK` are set)

The starter in [`/code/week-15-mcp-agent`](../code/week-15-mcp-agent/) is this loop, with a local mock for `web_search`. Give it a real task once you replace that mock. Until then, do not cite its search snippets as facts.

### Trajectory eval — do this before you call the agent done

Single-call evals from Week 7 do not grade a path. Add a small one now. The deep version, including adversarial cases, stays in Module 11. This is the minimum that should exist before Week 16's dashboard.

The starter's `npm run eval` runs **10 tasks, N=3** (override with `EVAL_N`). Each task declares required tools, forbidden tools, and a step cap. Every call must be on the allow-list. Each run must stay under the token cap and, when prices are set, the cost ceiling. A failure names the tool rule that broke. It does not grade the prose.

Read the misses before you edit the system prompt. Then keep going — Week 27 is where you add an outcome judge and a safety suite. This file is not that suite.

### Anti-patterns to avoid
- ❌ Giving the agent 20 tools — LLM gets confused. Start with 3, add only when needed.
- ❌ Vague tool descriptions — every tool's `description` is a mini-prompt. Treat it as such.
- ❌ Unbounded loops — always cap iterations AND cost
- ❌ Running without tracing — you *will* need Langfuse for debugging

---

## Week 16 — Observability for Agents

### What you're monitoring
- **Every LLM call** — prompt, response, tokens, cost, latency, model
- **Every tool call** — input, output, duration, errors
- **Every session** — user, full conversation tree, total cost, outcome
- **Aggregates** — p50/p95 latency, cost per task, success rate, tool-use distribution

### Tool choice
- **Langfuse** (open source, self-host or Langfuse Cloud free tier) — recommended
- **LangSmith** (LangChain's product, works beyond LangChain)
- **Arize Phoenix** (OSS, newer, has solid eval integration)
- **Braintrust** (eval-focused, paid)

### Reading (90 min)
- [Langfuse docs — Tracing](https://langfuse.com/docs/tracing)
- [Langfuse integration guides](https://langfuse.com/docs/integrations/overview) — pick TypeScript + OpenAI; the SDK instruments the OpenAI client, so it traces every compatible provider you point it at
- [Observability for LLM applications — Chip Huyen](https://huyenchip.com/2023/10/10/multimodal.html)

### Weekend project (3 hours)

Wire your **Week 15 research agent** to Langfuse.
1. Sign up for Langfuse Cloud (or Docker-compose self-host)
2. Instrument every LLM call, every tool call, every session
3. Run 20 research tasks on 20 different topics
4. Screenshot your dashboard:
   - Cost per task distribution
   - p95 latency
   - Top 3 most expensive single LLM calls (often your prompts are too long!)
   - Tool-use frequency histogram

### The insight you're looking for
After 20 runs, you'll see patterns:
- One tool is called 80% of the time → maybe others are redundant
- Some task types cost 5× more than others → flag for optimization or different model
- Certain failure modes recur → eval targets

This is **production AI engineering work**. People get paid six figures to do exactly this loop.

### 🧪 QA bridge
Your Langfuse dashboard is to LLMs what your Playwright HTML reporter is to browser tests. Same reflexes: look for flakes (high variance), regressions (sudden cost spikes), coverage gaps (tools never called).

---

## Self-check before moving on

- [ ] You can explain ReAct and when it's the wrong choice
- [ ] You have an MCP server running that shows up in your MCP client
- [ ] Your research agent has completed 20+ tasks with full traces
- [ ] You've spotted at least one optimization from looking at your dashboard
- [ ] You have a personal opinion on Mastra vs Vercel AI SDK vs LangGraph
- [ ] `npm run eval` has printed a pass rate for the 10-task trajectory set, and you can explain one failure

---

## Daily 15-min tasks

- **Mon:** Browse one new MCP server in the [official servers repo](https://github.com/modelcontextprotocol/servers). Understand what it exposes.
- **Tue:** Run one old task through your agent with `LLM_MODEL_SMALL`. Note where quality breaks and what the cost did.
- **Wed:** Read one research post from a frontier lab ([Anthropic](https://www.anthropic.com/research), [OpenAI](https://openai.com/research/), [Google DeepMind](https://deepmind.google/research/))
- **Thu:** Refactor one agent tool description — make it tighter
- **Fri:** Open your Langfuse dashboard. Look at it for 5 minutes. Write down one pattern you notice.

---

## ⏭️ Next up
**[Module 5 — Browser Agents](./05-browser-agents.md)** — Weeks 17–19. Your Playwright superpowers finally pay off. You'll build agents that drive real browsers via natural language.
