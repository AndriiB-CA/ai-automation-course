# 🎥 Curated Video Library

> Watching without building is a trap. Use these to reinforce what you've already tried in code, or as a first pass before a hands-on session.

> **Freshness (mid-2026):** The mental-model classics (Karpathy, 3Blue1Brown) are evergreen — start there. For fast-moving tooling (MCP, agent SDKs, Playwright Agents, GraphRAG), prefer official channels and docs over older tutorials; tool-specific videos age out within months, so treat anything pre-2025 as "concepts only."

---

## Part 1 — Foundations

### Mental model
- [**Intro to LLMs — Andrej Karpathy**](https://www.youtube.com/watch?v=zjkBMFhNj_g) (1h) — foundational. Watch once, rewatch around Week 10.
- [**[1hr Talk] Intro to Large Language Models — Karpathy**](https://www.youtube.com/watch?v=zjkBMFhNj_g) (same video, good for re-watching)
- [**Transformer explained visually — 3Blue1Brown**](https://www.youtube.com/watch?v=wjZofJX0v4M) (26m) — best visual intuition

### Prompt engineering
- [**Anthropic Prompt Engineering overview**](https://www.youtube.com/watch?v=T9aRN5JkmL8) (30m)
- [**Prompt Engineering — DeepLearning.AI short course**](https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/) (1.5h, free, hands-on notebooks)

### The Anthropic cookbook videos
- [**Anthropic YouTube channel**](https://www.youtube.com/@anthropic-ai) — new videos every few weeks, high-quality, short

---

## Part 2 — Evaluation & Testing

- [**How to evaluate LLM apps — Hamel Husain**](https://hamel.dev/blog/posts/evals/) (embedded video ~30m) — **mandatory**
- [**Jason Liu — Instructor & Structured Outputs**](https://www.youtube.com/watch?v=yj-wSRJwrrc) (45m)
- [**Eugene Yan — Evaluating LLMs in production**](https://eugeneyan.com/writing/llm-evaluators/) (article with embedded video)
- 🆕 **2026 platforms:** once Hamel's fundamentals click, skim [Braintrust](https://www.braintrust.dev/) (all-in-one, CI-gated) and [DeepEval](https://github.com/confident-ai/deepeval) (pytest-style) walkthroughs to see how teams operationalize evals

---

## Part 3 — RAG

- [**Advanced RAG Techniques — James Briggs**](https://www.youtube.com/watch?v=ea2W8IogX80) (40m)
- [**Building Production RAG — LangChain Academy**](https://academy.langchain.com/courses/intro-to-langchain) (free, multi-hour)
- [**Embeddings — What they are and why they matter — Cohere**](https://www.youtube.com/watch?v=OATCgQtNX2o) (20m)
- [**pgvector explained — Supabase**](https://www.youtube.com/watch?v=ibzlEQmgPPY) (15m)
- 🆕 [**GraphRAG — Microsoft Research**](https://www.microsoft.com/en-us/research/project/graphrag/) (project page + talks) — entity-graph RAG for multi-hop "who approved X and why?" questions on complex corpora

---

## Part 4 — Agents & MCP

- [**Agentic Design Patterns — Andrew Ng at Sequoia AI**](https://www.youtube.com/watch?v=sal78ACtGTc) (30m) — **mandatory**
- [**Building Effective Agents — Anthropic**](https://www.anthropic.com/research/building-effective-agents) (blog with embedded video)
- [**MCP Explained — Anthropic**](https://www.youtube.com/watch?v=7j1t3UZA1TY) (30m)
- [**Mastra Framework deep dive**](https://www.youtube.com/@mastra-ai) (channel, multiple tutorials)
- 🆕 [**Building Agents with the Claude Agent SDK — Anthropic**](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk) (engineering post + demo) — the same engine that powers Claude Code
- 🆕 **2026 note:** MCP is now a Linux Foundation standard with OpenAI/Google/Microsoft support — prioritize current MCP content over 2024 explainers

---

## Part 5 — Browser Agents

- [**Building Browser Agents with Stagehand — Browserbase**](https://www.youtube.com/@browserbasehq) (channel)
- [**Claude Computer Use — official demo**](https://www.youtube.com/watch?v=vh9tDq1EZBU) (15m)
- [**Browser-Use walkthrough**](https://www.youtube.com/watch?v=rz51-dCzKQA) (25m) — Python reference impl (50k+ stars)
- 🆕 [**Playwright Agents — official docs & talks**](https://playwright.dev/docs/playwright-agents) (v1.56+) — NL test-gen + self-healing built directly into Playwright; start here if you already use it

---

## Part 6 — AI-Powered QA

- [**Claude Code for Testing — Anthropic demos**](https://www.youtube.com/@anthropic-ai) (multiple videos)
- [**Playwright — Best Practices talk**](https://www.youtube.com/@Playwrightdev) (30m)
- [**LLM-powered test generation — Cursor/Windsurf demos**](https://www.youtube.com/@cursor-ai) (varied)

---

## Part 7 — Production & Cost

- [**Prompt Caching deep dive — Anthropic**](https://www.youtube.com/watch?v=TBtojJ5qlzA) (20m)
- [**Running LLMs at scale — Latent Space pods**](https://www.latent.space/) (audio, read transcripts instead)
- [**LLM Observability with Langfuse**](https://www.youtube.com/@langfuse) (channel)

---

## Part 8 — AI Security

- [**AI Red Teaming — Anthropic Research**](https://www.youtube.com/watch?v=-vK8WpDXFLI) (40m) — **mandatory**
- [**Prompt Injection at PyCon — Simon Willison**](https://www.youtube.com/watch?v=3Gt_OPBoTt0) (30m)
- [**Embrace the Red — YouTube channel**](https://www.youtube.com/@embracethered) — the leading practical AI security channel
- [**OWASP LLM Top 10 walkthrough**](https://www.youtube.com/results?search_query=OWASP+LLM+Top+10) (many options, pick any ~30m)

---

## Long-form courses (optional, only if you have appetite)

- [**Building Systems with the ChatGPT API — DeepLearning.AI**](https://www.deeplearning.ai/short-courses/building-systems-with-chatgpt/) (free, 1–2h)
- [**LangChain for LLM Application Development — DeepLearning.AI**](https://www.deeplearning.ai/short-courses/langchain-for-llm-application-development/)
- [**LangChain Chat with Your Data — DeepLearning.AI**](https://www.deeplearning.ai/short-courses/langchain-chat-with-your-data/)
- [**Full Stack LLM Bootcamp**](https://fullstackdeeplearning.com/llm-bootcamp/) (free, comprehensive)

---

## YouTube channels to subscribe to

- **[Anthropic](https://www.youtube.com/@anthropic-ai)** — official, high signal
- **[AI Jason](https://www.youtube.com/@AIJasonZ)** — practical builds, TypeScript-first
- **[Matt Pocock](https://www.youtube.com/@mattpocockuk)** — TypeScript, type-system wizardry useful for LLM schemas
- **[fireship](https://www.youtube.com/@Fireship)** — short, opinionated takes on new tools
- **[Sam Witteveen](https://www.youtube.com/@samwitteveenai)** — agent-heavy, current, pragmatic
- **[Greg Kamradt](https://www.youtube.com/@DataIndependent)** — RAG deep dives

---

## Podcasts (commute-friendly, no typing required)

- **[Latent Space](https://www.latent.space/podcast)** — the canonical "AI engineer" podcast
- **[No Priors](https://podcasts.apple.com/us/podcast/no-priors-artificial-intelligence/id1668002688)** — AI founders & researchers
- **[Practical AI](https://changelog.com/practicalai)** — approachable, practical

---

## How to choose what to watch

- 🎯 **Have 30 mins?** — Karpathy "Intro to LLMs" always pays dividends
- 🔨 **About to build?** — find the most specific tutorial for that tool
- 🧠 **Stuck understanding a concept?** — 3Blue1Brown or Anthropic explainers
- 🛡️ **Feeling complacent?** — Embrace the Red will fix that

**Don't binge.** One video, then code. If you're watching three in a row without building, close the tab.
