# 🗺️ The 24-Week Roadmap

> Each week targets **5–7 focused hours**: three 30-min weekday sessions + one 3–4 hr weekend build.
> **Don't skip weekends.** The weekend session is where the real learning compounds.

---

## How the phases fit together

```
  ┌─────────────────────────────────────────────────────────────┐
  │  PHASE 1  ──  FOUNDATIONS (Weeks 1–8)                       │
  │  API calls → structured outputs → tool use → prompts → EVALS│
  │                            │                                │
  │  PHASE 2  ──  BUILD (Weeks 9–19)                            │
  │  RAG → Agents → MCP → Browser Agents (your superpower zone) │
  │                            │                                │
  │  PHASE 3  ──  SHIP (Weeks 20–24)                            │
  │  AI-powered QA → Production → Security → CAPSTONE           │
  └─────────────────────────────────────────────────────────────┘
```

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

### 🟦 Week 2 — Your First Real API Call
**Goal:** Understand tokens, temperature, streaming, system prompts.
- Code along: [`/code/week-02-first-api-call`](./code/week-02-first-api-call/)
- Read: Anthropic's [Messages API docs](https://docs.claude.com/en/api/messages)
- Video: [Prompt Engineering Overview (Anthropic, 30m)](https://www.youtube.com/watch?v=T9aRN5JkmL8)
- **Project:** Build a CLI tool that takes a URL, summarizes the page in three bullet points using streaming
- Extend: Add `--tone=formal|casual` flag (prompt variation practice)

### 🟦 Week 3 — Structured Outputs
**Goal:** Get JSON out of an LLM *reliably*, validated with Zod.
- Tools: Zod + Anthropic SDK, or OpenAI's `response_format: json_schema`
- Read: [Extract structured data with Claude](https://docs.claude.com/en/docs/build-with-claude/extracting-structured-data)
- **Project:** Build a tool that parses messy bug reports (free text) into `{title, severity, steps, expected, actual}` schema
- 🧪 **QA bridge:** This is literally structured test-report generation. Save the output template — you'll use it again.

### 🟦 Week 4 — Tool Use / Function Calling
**Goal:** LLM can call your TypeScript functions and chain multiple calls.
- Code along: [`/code/week-06-structured-tools`](./code/week-06-structured-tools/)
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
- Code along: [`/code/week-07-promptfoo-evals`](./code/week-07-promptfoo-evals/)
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
- Code along: [`/code/week-10-rag-pgvector`](./code/week-10-rag-pgvector/)
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

---

### 🟧 Week 13 — Agent Architectures
**Goal:** Distinguish ReAct, Plan-and-Execute, Reflexion. Know which fits which problem.
- Read: [Building Effective Agents (Anthropic)](https://www.anthropic.com/research/building-effective-agents)
- Video: [Agentic Patterns (Andrew Ng, 30m)](https://www.youtube.com/watch?v=sal78ACtGTc)
- **Project:** Implement a minimal ReAct loop in TypeScript in <200 lines. No framework.

### 🟧 Week 14 — Model Context Protocol (MCP)
**Goal:** The open standard for giving agents tools. Ship a custom MCP server.
- Code along: [`/code/week-15-mcp-agent`](./code/week-15-mcp-agent/)
- Read: [Model Context Protocol docs](https://modelcontextprotocol.io/)
- Explore: [Official MCP servers](https://github.com/modelcontextprotocol/servers)
- **Project:** Build an MCP server exposing your local filesystem + a custom tool. Use it from Claude Desktop.

### 🟧 Week 15 — Multi-Tool Agents
**Goal:** An agent with 5+ tools, memory, and error handling.
- Framework options: Vercel AI SDK (TypeScript) or Mastra (TypeScript-native agent framework)
- Read: [Mastra docs](https://mastra.ai/docs)
- **Project:** "Research agent" with tools: `web_search`, `web_fetch`, `summarize`, `save_to_notion` (or `save_to_file`). Handles its own failures with retry logic.

### 🟧 Week 16 — Observability for Agents
**Goal:** You can see every LLM call, cost, and decision path.
- Tool: Langfuse (self-hostable) or LangSmith
- **Project:** Wire your Week 15 agent to Langfuse. Run 20 tasks. Produce a dashboard screenshot showing cost per task and p95 latency.
- 🧪 **QA bridge:** This is `Datadog for LLMs`. Same mental model.

---

### 🟪 Week 17 — Playwright Meets LLMs
**Goal:** Make Claude drive a browser via Playwright through natural language.
- Code along: [`/code/week-18-browser-agent`](./code/week-18-browser-agent/)
- Read: [Stagehand docs (Browserbase)](https://docs.stagehand.dev/)
- **Project:** "Book an appointment" agent. Given a URL and a task description, it navigates, fills forms, and reports success/failure.

### 🟪 Week 18 — Vision-Based Automation
**Goal:** Use Claude's vision capability to interact with pages that resist selectors.
- Read: [Anthropic Computer Use overview](https://www.anthropic.com/news/3-5-models-and-computer-use)
- Explore: [Browser-Use (Python)](https://github.com/browser-use/browser-use) as reference
- **Project:** Rebuild last week's agent but use screenshots + coordinates instead of selectors. Compare reliability.

### 🟪 Week 19 — Production Browser Agents
**Goal:** Headless at scale, with recovery, with observability.
- Topics: sandboxing, timeouts, rate limits, captcha realism
- 🛡️ **Security:** Read [Simon Willison on LLMs driving browsers](https://simonwillison.net/tags/ai-agents/) — understand the attack surface before you expose one publicly
- **Project:** Put your Week 17 agent in Docker, run 10 tasks in parallel on a schedule, store traces

---

## Phase 3 — Ship (Weeks 20–24)

### 🟥 Week 20 — AI-Powered Test Generation ⭐ (Your Track)
**Goal:** Given a page URL or PR diff, an LLM writes valid Playwright tests.
- Code along: [`/code/week-20-ai-test-generator`](./code/week-20-ai-test-generator/)
- Read: [Using Claude Code for test generation](https://docs.claude.com/en/docs/claude-code/overview)
- **Project:** CLI tool: `npx ai-testgen <url>` → emits `*.spec.ts` with assertions and proper awaits

### 🟥 Week 21 — Self-Healing Selectors ⭐ (Your Track)
**Goal:** When a test fails because the DOM changed, an LLM proposes a fix, you review the PR.
- **Project:** A Playwright `Locator` wrapper that, on failure, captures the DOM, asks Claude "given this test intent, find the new selector," and emits a suggested patch
- 🧪 This is directly leading to your capstone — save all this code

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

See [`modules/08-capstone.md`](./modules/08-capstone.md) for the full spec.

**Success criteria:**
- [ ] Repo has README with clear setup steps
- [ ] At least one real-world example test suite included
- [ ] Demo video/GIF in README
- [ ] Costs and latency documented
- [ ] Evals for the healer itself (meta!)
- [ ] Blog post explaining the architecture published
- [ ] LinkedIn post announcing it

---

## Spaced repetition

Every 4 weeks, spend one weekday revisiting the prior 4 weeks' daily tasks. Re-run one old project with your current knowledge. You'll be shocked how much better your code looks.

## When you fall behind

You will. Everyone does.

**The rule:** Never skip more than one weekend project in a row. Reading without building compounds into nothing. If the week gets hard, shorten the project scope — but ship *something*.
