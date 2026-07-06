# 🗺️ The Roadmap (24 weeks core + bonus + companion modules)

> Each week targets **5–7 focused hours**: three 30-min weekday sessions + one 3–4 hr weekend build. **Don't skip weekends.** The weekend session is where the real learning compounds.

> 📎 **Companion & career modules.** Four modules (12–15) aren't extra weeks — they weave into the journey to close the gap between "AI engineer" and "AI **automation** engineer." Each is flagged at the right point below, and summarized in the [README](./README.md#-companion--career-modules-woven-into-the-journey-not-extra-weeks).

---

## How the phases fit together

```
┌───────────────────────────────────────────────────────────────┐
│  PHASE 1  ──  FOUNDATIONS (Weeks 1–8)                       │
│  API calls → structured outputs → tool use → prompts → EVALS│
│                            │                                │
│  PHASE 2  ──  BUILD (Weeks 9–19)                            │
│  RAG → [IDP] → Agents → [Multi-agent] → Browser Agents      │
│                            │                                │
│  PHASE 3  ──  SHIP (Weeks 20–24)                            │
│  AI-powered QA → Production → Security → CAPSTONE           │
│                            │                                │
│  PHASE 4  ──  BONUS (Weeks 25–28)                          │
│  n8n Automation → Evaluating Agents (trajectory + safety)  │
│                            │                                │
│  CAREER   ──  Business Translation (throughout) +          │
│              Interview Prep & System Design (after W24)    │
└───────────────────────────────────────────────────────────────┘
   [ ] = companion module woven in, not a separate week
```

> 💡 **Read [Module 13 — Business Translation](./modules/13-business-translation.md) now (skim).** Process mapping, ROI, and stakeholder communication are a thread you'll apply in every project from here on — and the #1 thing that distinguishes an automation engineer from a pure builder. Deep-read it before the capstone.

---

## Phase 1 — Foundations (Weeks 1–8)

### 🟦 Week 1 — Orientation & Setup
**Goal:** Everything installed, first "hello world" API call succeeds.
- Read: [SETUP.md](./SETUP.md) end to end
- Install: Node.js 20+, Python 3.12, `uv`, VS Code extensions
- Get: Anthropic API key (billing set to ~$20 cap), OpenAI key (optional)
- Mental model: [Andrej Karpathy – "Intro to LLMs" (1h)](https://www.youtube.com/watch?v=zjkBMFhNj_g)
- 🛡️ **Security-from-day-1:** Put your API key in `.env`, add `.env` to `.gitignore`, rotate a key once to prove you can
- **Deliverable:** Screenshot of a successful `anthropic.messages.create` response

> 📎 **Read this week or next — [Module 16: Working with AI Coding Agents](./modules/16-ai-coding-agents.md).** The meta-skill of the 2026 job market: driving Claude Code / Cursor-class tools with a real workflow — context files, right-sized task specs, a review protocol for AI-written diffs, verification loops, and guardrails. Every weekend project from here on goes faster if you set this up now, and "how do you work with coding agents?" is now a standard interview question.

### 🟦 Week 2 — Your First Real API Call
**Goal:** Understand tokens, temperature, streaming, system prompts.
- Code along: [`/code/week-02-first-api-call`](./code/week-02-first-api-call)
- Read: Anthropic's [Messages API docs](https://docs.claude.com/en/api/messages)
- Video: [Prompt Engineering Overview (Anthropic, 30m)](https://www.youtube.com/watch?v=T9aRN5JkmL8)
- **Project:** Build a CLI tool that takes a URL, summarizes the page in three bullet points using streaming
- Extend: Add `--tone=formal|casual` flag (prompt variation practice)

### 🟦 Week 3 — Structured Outputs
**Goal:** Get JSON out of an LLM *reliably*, validated with Zod.
- Tools: Zod + Anthropic SDK, or OpenAI's `response_format: json_schema`
- Read: [Extract structured data with Claude](https://docs.claude.com/en/docs/build-with-claude/extracting-structured-data)
- **Project:** Build a tool that parses messy bug reports (free text) into `{title, severity, steps, expected, actual}` schema
- 🧪 **QA bridge:** This is literally structured test-report generation. Save the output template — you'll use it again (and again in Module 14, IDP).

### 🟦 Week 4 — Tool Use / Function Calling
**Goal:** LLM can call your TypeScript functions and chain multiple calls.
- Code along: [`/code/week-06-structured-tools`](./code/week-06-structured-tools)
- Read: [Tool use with Claude](https://docs.claude.com/en/docs/build-with-claude/tool-use)
- Video: [Function Calling Explained (AI Jason, 20m)](https://www.youtube.com/watch?v=0lOSvOoF2to)
- **Project:** Agent that, given a GitHub repo URL, uses three tools (`fetch_readme`, `list_issues`, `search_code`) to answer natural-language questions about the repo

---

### 🟩 Week 5 — Prompt Engineering Patterns
**Goal:** Know when to use zero-shot, few-shot, CoT, XML tags, and why.
- Read in full: [Anthropic's Prompt Engineering Guide](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview)
- Do every exercise in: [Anthropic Prompt Eng Interactive Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)
- **Project:** Take last week's agent and add XML-tag prompt structure, few-shot examples, and a "skeleton of thought" response format. Measure quality difference on 10 inputs.

### 🟩 Week 6 — System Prompts, Personas, Refusals
**Goal:** Craft system prompts that are testable and robust to edge cases.
- Read: [Claude character & system prompts](https://docs.claude.com/en/release-notes/system-prompts)
- Inspect Claude.ai's leaked system prompt structure in [awesome-claude-prompts](https://github.com/langgptai/awesome-claude-prompts)
- 🛡️ **Security:** Read [Prompt injection in action](https://simonwillison.net/tags/prompt-injection/) — skim five posts
- **Project:** Write a "PR review bot" system prompt that (a) reviews TS code, (b) refuses requests to do anything else, (c) stays in character under adversarial inputs

### 🟩 Week 7 — Evals 101 with Promptfoo ⭐
**Goal:** Every LLM feature you ship now gets an eval before merge. This is your QA superpower.
- Install: `npm install -g promptfoo`
- Code along: [`/code/week-07-promptfoo-evals`](./code/week-07-promptfoo-evals)
- Read: [Promptfoo docs – Getting Started](https://www.promptfoo.dev/docs/getting-started/)
- Video: [How to eval your LLM app (Hamel Husain, 30m)](https://hamel.dev/blog/posts/evals/)
- **Project:** Build an eval suite for your Week 6 PR review bot. Include assertions: `contains-json`, `llm-rubric`, `javascript` custom eval, and **cost** threshold. Run it in GitHub Actions.

### 🟩 Week 8 — Golden Datasets & LLM Regression Testing
**Goal:** Treat prompts like you treat selectors — versioned, tested, reproducible.
- Read: [Your AI product needs evals (Hamel Husain)](https://hamel.dev/blog/posts/evals/)
- Learn: LLM-as-judge patterns, model graded evals, pairwise comparison
- 🧪 **QA bridge:** Map your Playwright regression mindset → LLM regression mindset. Write the mapping in a note. You'll reference it for years.
- **Project:** Create a 25-case golden dataset for your bot. Wire it into CI so a PR that changes the prompt fails if quality drops below threshold.

---

## Phase 2 — Build (Weeks 9–19)

### 🟨 Week 9 — Embeddings from scratch
**Goal:** Understand what embeddings are, calculate similarity, see where they fail.
- Video: [The Illustrated Transformer (visual guide, read not watch)](https://jalammar.github.io/illustrated-transformer/)
- Video: [Embeddings — What they are (Cohere, 20m)](https://www.youtube.com/watch?v=OATCgQtNX2o)
- **Project:** Embed 100 of your own chat messages or Slack threads, cluster them with a simple t-SNE, label the clusters

### 🟨 Week 10 — Vector DBs with pgvector
**Goal:** Store and query embeddings in Postgres. No exotic infra.
- Code along: [`/code/week-10-rag-pgvector`](./code/week-10-rag-pgvector)
- Read: [pgvector README](https://github.com/pgvector/pgvector)
- **Project:** Docker-compose a Postgres instance with pgvector, ingest 500 documents, query with cosine similarity, measure recall@k

### 🟨 Week 11 — Chunking + Retrieval Strategies
**Goal:** Know when to use fixed-size, semantic, or recursive chunking. Know when hybrid search beats pure vector.
- Read: [Chunking Strategies for LLM Applications (Pinecone)](https://www.pinecone.io/learn/chunking-strategies/)
- Read: [Hybrid search explained (Weaviate)](https://weaviate.io/blog/hybrid-search-explained)
- **Project:** Take your Week 10 setup. Try 3 chunking strategies, measure retrieval quality on 20 queries using `Precision@5`. Write up results.

### 🟨 Week 12 — Ship a RAG App
**Goal:** Deployed URL you can share. Real data, real users (even if only you).
- Stack suggestion: Next.js + Vercel AI SDK + Supabase (pgvector) + deploy to Vercel
- Read: [Vercel AI SDK docs](https://sdk.vercel.ai/docs)
- **Project:** Ship a RAG chatbot over something YOU care about — your Notion docs, your blog archive, your company's public docs. Document the retrieval evals.

> 📎 **Companion project — [Module 14: Intelligent Document Processing](./modules/14-document-processing.md).** Now that you have RAG and structured outputs, build an IDP pipeline (invoice/receipt → validated structured data). It's the #1 real-world automation use case and a flagship portfolio piece. Do it as an extra weekend build here, or slot it after Week 19 if you're pacing tight. Starter code: [`/code/module-14-idp`](./code/module-14-idp).

---

### 🟧 Week 13 — Agent Architectures
**Goal:** Distinguish ReAct, Plan-and-Execute, Reflexion. Know which fits which problem.
- Read: [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- Video: [Agentic Patterns (Andrew Ng, 30m)](https://www.youtube.com/watch?v=sal78ACtGTc)
- **Project:** Implement a minimal ReAct loop in TypeScript in <200 lines. No framework.

### 🟧 Week 14 — Model Context Protocol (MCP)
**Goal:** The open standard for giving agents tools. Ship a custom MCP server.
- Code along: [`/code/week-15-mcp-agent`](./code/week-15-mcp-agent)
- Read: [Model Context Protocol docs](https://modelcontextprotocol.io/)
- Explore: [Official MCP servers](https://github.com/modelcontextprotocol/servers)
- **Project:** Build an MCP server exposing your local filesystem + a custom tool. Use it from Claude Desktop.

### 🟧 Week 15 — Multi-Tool Agents
**Goal:** An agent with 5+ tools, memory, and error handling.
- Framework options: Vercel AI SDK (TypeScript) or Mastra (TypeScript-native agent framework)
- Read: [Mastra docs](https://mastra.ai/docs)
- **Project:** "Research agent" with tools: `web_search`, `web_fetch`, `summarize`, `save_to_notion` (or `save_to_file`). Handles its own failures with retry logic.

> 📎 **Read now — [Module 12: Multi-Agent Orchestration & the Claude Agent SDK](./modules/12-multi-agent-orchestration.md).** This is the biggest 2026 skill upgrade in the whole course: manager/worker systems, the **Claude Agent SDK**, the **Constrained Autonomy** production pattern (tool whitelists, output validation, human-in-the-loop, audit logging), the current framework landscape, the MCP/A2A/AGENTS.md protocols, and multi-agent cost control. Its weekend project upgrades this very research agent into a multi-agent system. **Do not skip it** — it's where single-agent tinkering becomes production architecture. Starter code: [`/code/module-12-multi-agent`](./code/module-12-multi-agent).

### 🟧 Week 16 — Observability for Agents
**Goal:** You can see every LLM call, cost, and decision path.
- Tool: Langfuse (self-hostable) or LangSmith
- **Project:** Wire your Week 15 agent to Langfuse. Run 20 tasks. Produce a dashboard screenshot showing cost per task and p95 latency.
- 🧪 **QA bridge:** This is `Datadog for LLMs`. Same mental model.

---

### 🟥 Week 17 — Playwright Meets LLMs
**Goal:** Make Claude drive a browser via Playwright through natural language.
- Code along: [`/code/week-18-browser-agent`](./code/week-18-browser-agent)
- Read: [Stagehand docs (Browserbase)](https://docs.stagehand.dev/)
- **Project:** "Book an appointment" agent. Given a URL and a task description, it navigates, fills forms, and reports success/failure.

### 🟥 Week 18 — Vision-Based Automation
**Goal:** Use Claude's vision capability to interact with pages that resist selectors.
- Read: [Anthropic Computer Use overview](https://www.anthropic.com/news/3-5-models-and-computer-use)
- Explore: [Browser-Use (Python)](https://github.com/browser-use/browser-use) as reference
- **Project:** Rebuild last week's agent but use screenshots + coordinates instead of selectors. Compare reliability.

### 🟥 Week 19 — Production Browser Agents
**Goal:** Headless at scale, with recovery, with observability.
- Topics: sandboxing, timeouts, rate limits, captcha realism
- 🛡️ **Security:** Read [Simon Willison on LLMs driving browsers](https://simonwillison.net/tags/ai-agents/) — understand the attack surface before you expose one publicly
- **Project:** Put your Week 17 agent in Docker, run 10 tasks in parallel on a schedule, store traces

---

## Phase 3 — Ship (Weeks 20–24)

### 🟥 Week 20 — AI-Powered Test Generation ⭐ (Your Track)
**Goal:** Given a page URL or PR diff, an LLM writes valid Playwright tests.
- Code along: [`/code/week-20-ai-test-generator`](./code/week-20-ai-test-generator)
- Read: [Using Claude Code for test generation](https://docs.claude.com/en/docs/claude-code/overview)
- **Project:** CLI tool: `npx ai-testgen <url>` → emits `*.spec.ts` with assertions and proper awaits

### 🟥 Week 21 — Self-Healing Selectors ⭐ (Your Track)
**Goal:** When a test fails because the DOM changed, an LLM proposes a fix, you review the PR.
- **Project:** A Playwright `Locator` wrapper that, on failure, captures the DOM, asks Claude "given this test intent, find the new selector," and emits a suggested patch
- 🧪 This is directly leading to your capstone — save all this code
- 📎 **Tip:** Apply Module 12 here — a small manager/worker split (one agent locates the broken element, one proposes + validates the fix) makes the healer notably more robust.

### 🟥 Week 22 — Production & Cost Engineering
**Goal:** Your app stays cheap and fast in production.
- Topics: prompt caching, batch API, response caching, streaming back-pressure, circuit breakers
- Read: [Anthropic prompt caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching)
- **Project:** Take any prior project, enable prompt caching, measure cost reduction. Add a semantic cache layer on top.

### 🟥 Week 23 — AI Security Deep Dive 🛡️
**Goal:** Ship without being pwned.
- Read in full: [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)
- Read: [Prompt Injection attacks (Simon Willison)](https://simonwillison.net/2023/May/2/prompt-injection-explained/)
- Video: [AI Red Teaming (Anthropic Research, 40m)](https://www.youtube.com/watch?v=-vK8WpDXFLI)
- **Project:** Red-team your own Week 15 agent. Try prompt injection via tool outputs. Document all bypasses you find. Ship mitigations.

### 🟥 Week 24 — CAPSTONE: AI-Powered Playwright Healer 🚀
**Goal:** Public GitHub repo + blog post + LinkedIn announcement.

See [`modules/09-capstone.md`](./modules/09-capstone.md) for the full spec.

> 📎 **Before you start:** deep-read [Module 13 — Business Translation](./modules/13-business-translation.md) and add an **Impact section with real numbers** to the capstone README (heal success rate, cost/heal, time saved). Quantified impact is what hiring managers screen for.

**Success criteria:**
- [ ] Repo has README with clear setup steps
- [ ] At least one real-world example test suite included
- [ ] Demo video/GIF in README
- [ ] Costs and latency documented
- [ ] Evals for the healer itself (meta!)
- [ ] Quantified Impact section (Module 13)
- [ ] Blog post explaining the architecture published
- [ ] LinkedIn post announcing it

---

## Phase 4 — Bonus (Weeks 25–28)
> Optional, but high-leverage. The capstone proves you can build AI tools in code. This phase makes them usable by your whole team — and proves they're reliable.

### 🟥 Week 25 — n8n Fundamentals + Claude Integration
**Goal:** Self-host n8n, call Claude from a workflow, ship a Slack → AI → Slack bot.
- Full module: [`modules/10-n8n.md`](./modules/10-n8n.md)
- Read: [n8n Getting Started](https://docs.n8n.io/getting-started/) + [HTTP Request node](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.httprequest/)
- **Project:** A Slack bot that classifies QA alerts via Claude (Haiku) and posts verdicts back to the thread, with an error-handling workflow.

### 🟥 Week 26 — n8n + Your QA Stack
**Goal:** Wire n8n to the tools you built in Weeks 1–24 so non-engineers can trigger them.
- **Project:** A CI failure triage pipeline (GitHub → Claude → Jira + Slack), an MCP-tools HTTP wrapper callable from a webhook, and a nightly AI quality digest.
- 🧭 **The boundary:** if a business analyst could draw the flowchart and it's under ~15 steps, n8n wins; if the LLM must decide what to do next, write a code agent (Module 12).

### 🟥 Week 27 — Trajectory & Outcome Evaluation
**Goal:** Grade an agent's *path*, not just its final answer — and report pass-rate over N runs.
- Full module: [`modules/11-agent-evals.md`](./modules/11-agent-evals.md)
- Read: [Evaluating agents — LangSmith](https://docs.smith.langchain.com/evaluation/concepts), [τ-bench](https://github.com/sierra-research/tau-bench), [BFCL](https://gorilla.cs.berkeley.edu/leaderboard.html)
- **Project:** An eval harness for your Week 15 / Module 12 agent — a 15-task golden set with success criteria + budgets, trajectory assertions (tool selection, step/cost), and an LLM-as-judge over the path, run at N=3–5.

### 🟥 Week 28 — Adversarial & Safety Evals 🛡️
**Goal:** Turn the Module 8 red-team into repeatable, CI-gated safety evals.
- Read: [OWASP Top 10 for Agentic AI (2026)](https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/), [Promptfoo red teaming](https://www.promptfoo.dev/docs/red-team/)
- **Project:** An adversarial suite mapped to OWASP Agentic risks with **zero-tolerance** safety invariants (no exfil tool call; budget cap fires), gating merges in CI alongside a quality-regression threshold.
- 📎 **Connect it:** these safety invariants are exactly the four pillars of **Constrained Autonomy** (Module 12) under test.

---

## Career track — run in parallel, finish strong

> These two modules turn skills into offers. Business Translation is a thread throughout; Interview Prep is your finish line.

### 📎 [Module 13 — Business Translation](./modules/13-business-translation.md) *(throughout)*
Process mapping (BPMN), automation-candidate selection, ROI modeling, stakeholder communication, quantified-impact documentation. Skim in Phase 1, apply in every project README, deep-read before the capstone and the job hunt. **This is the single biggest differentiator between an AI engineer and an AI automation engineer.**

### 📎 [Module 15 — Interview Prep & System Design](./modules/15-interview-prep.md) *(after Week 24)*
The standard 4–5 stage loop, a repeatable framework for automation-specific system-design questions, take-home strategy, and your QA→AI story. Your job-hunt launchpad.

### 📎 [Module 16 — Working with AI Coding Agents](./modules/16-ai-coding-agents.md) *(Week 1–2, then throughout)*
The meta-skill thread: mental model, repo setup (`CLAUDE.md`/`AGENTS.md`, guardrail tests), task scoping, the AI-diff review protocol, verification loops, and Constrained Autonomy applied to your own tools. Keep a delegation log — it becomes interview evidence.

---

## Spaced repetition
Every 4 weeks, spend one weekday revisiting the prior 4 weeks' daily tasks. Re-run one old project with your current knowledge. You'll be shocked how much better your code looks.

## When you fall behind
You will. Everyone does.

**The rule:** Never skip more than one weekend project in a row. Reading without building compounds into nothing. If the week gets hard, shorten the project scope — but ship *something*.
