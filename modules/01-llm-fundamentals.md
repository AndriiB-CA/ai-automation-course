# Module 1 — LLM API Fundamentals

**Weeks 2–4 · Phase 1: Foundations · ~18 hours total**

---

## Why this module matters

Before you can build agents, RAG systems, or AI-powered test tools, you need to be fluent with the raw API. Every abstraction you'll use later (Vercel AI SDK, Mastra, LangGraph) compiles down to the same three primitives: **messages, structured output, tool use**. Master them directly and every framework becomes easy.

## Learning objectives

By the end of this module you will:
- Call Claude and GPT APIs from TypeScript without a framework
- Stream responses token-by-token
- Force an LLM to return JSON that validates against a Zod schema
- Define tools an LLM can call, and handle the loop
- Know what each dollar of your API bill bought you

---

## Week 2 — Your First Real API Call

### Reading (90 min, spread across weekdays)
1. [Anthropic Messages API reference](https://docs.claude.com/en/api/messages) — skim the params, then focus on `system`, `messages`, `max_tokens`, `temperature`, `stream`
2. [Anthropic Pricing page](https://www.anthropic.com/pricing) — memorize roughly: Opus = expensive, Sonnet = balanced, Haiku = cheap-and-fast
3. Blog post: [A Brief Intro to LLM Inference (Chip Huyen)](https://huyenchip.com/2024/01/16/sampling.html)

### Videos (pick one, ~1 hour)
- 🎥 [Intro to LLMs — Andrej Karpathy (1h)](https://www.youtube.com/watch?v=zjkBMFhNj_g) — the mental model foundation
- 🎥 [Anthropic API Crash Course — AI Jason (25 min)](https://www.youtube.com/watch?v=T9aRN5JkmL8) — shorter, more practical

### Weekend project (3–4 hours)

**Build:** A CLI tool `summarize-url` that:
1. Takes a URL as an argument
2. Fetches the page, extracts text
3. Streams a 3-bullet summary to stdout
4. Accepts a `--tone=formal|casual|snarky` flag

See the starter in [`/code/week-02-first-api-call/`](../code/week-02-first-api-call/).

**Stretch goals:**
- Add `--model=haiku|sonnet|opus` and print cost at the end
- Add `--language=en|fr|es` (bonus: detect source language automatically)

### 🧪 QA bridge
Your summarizer has no tests yet. Think: what are the failure modes? URL returns 404, page is paywalled, page is gibberish, page is 2MB of JavaScript. Write these down. You'll build evals for exactly these in Week 7.

### 🛡️ Security callout
Your script fetches arbitrary URLs. What if a URL fetches an internal IP on the user's network? What if the page contains a prompt injection like "Ignore previous instructions and…"? For now: just be aware. We'll fix both in Weeks 19 and 23.

---

## Week 3 — Structured Outputs

### Reading (60 min)
- [Extract structured data with Claude](https://docs.claude.com/en/docs/build-with-claude/extracting-structured-data)
- [Zod documentation — Object schemas](https://zod.dev/?id=objects)
- Compare: Anthropic's "tool use for JSON" pattern vs OpenAI's `response_format: json_schema`

### Weekend project (3 hours)

**Build:** A `bug-report-parser` that takes messy, free-text bug reports (real Jira exports, Slack messages) and emits:

```ts
{
  title: string;          // ≤80 chars
  severity: "low" | "medium" | "high" | "critical";
  steps_to_reproduce: string[];
  expected_behavior: string;
  actual_behavior: string;
  environment?: { os?: string; browser?: string; version?: string };
  raw_text: string;       // the original input, for auditing
}
```

Validate every response with Zod. If validation fails, retry with an improved prompt. Give up after 3 retries.

See starter code in [`/code/week-06-structured-tools/bug-parser/`](../code/week-06-structured-tools/) (we'll repurpose this folder).

### 🧪 QA bridge — actually save this
You are building a structured-data extraction pipeline. The output schema above is exactly a bug-tracker import format. **Keep this code.** You'll reuse it for:
- Parsing user-reported issues into ticket format
- Turning Playwright test failures into structured incident reports
- The capstone (Week 24) needs this exact pattern

---

## Week 4 — Tool Use / Function Calling

### Reading (75 min)
- [Tool use with Claude — full doc](https://docs.claude.com/en/docs/build-with-claude/tool-use)
- [Tool use examples (Anthropic cookbook)](https://github.com/anthropics/anthropic-cookbook/tree/main/tool_use)
- Concept post: [ReAct: Reasoning + Acting](https://arxiv.org/abs/2210.03629) (skim abstract + first 3 pages)

### Video (30 min)
- 🎥 [Function Calling Explained — AI Jason](https://www.youtube.com/watch?v=0lOSvOoF2to)

### Weekend project (4 hours)

**Build:** A `repo-assistant` that answers natural-language questions about a public GitHub repo by calling tools.

Tools to implement:
- `fetch_readme(owner: string, repo: string) → string`
- `list_issues(owner: string, repo: string, state: "open" | "closed") → Issue[]`
- `search_code(owner: string, repo: string, query: string) → SearchResult[]`

Your agent loop:
1. Send user question + tool definitions
2. If the LLM returns `tool_use`, execute the tool, send result back
3. Loop until the LLM returns plain text
4. Hard-cap at 10 iterations (prevent runaway loops!)

Test questions to try:
- "What does this repo do?"
- "What are the three most recent open issues about memory leaks?"
- "Does this repo have any tests for authentication?"

### Key patterns to learn here
- **Tool schema design** — clear `description`, strict `input_schema`
- **The agent loop** — the single most important 30-line function in AI engineering
- **Error handling in tools** — don't throw; return `{error: "..."}` so the LLM can recover
- **Budget the loop** — iteration count, token count, wall-clock time

### 🛡️ Security callout
Your tools run your code. What if the LLM decides to call `list_issues("../../etc/passwd", ...)`? Validate inputs **even when they come from an LLM**. Treat LLM output as untrusted user input. Week 23 formalizes this.

---

## Self-check before moving on

You should be able to, **without Googling**:

- [ ] Write a minimum `anthropic.messages.create` call from memory
- [ ] Explain the difference between `temperature=0` and `temperature=1`
- [ ] Define a Zod schema for a nested object with optional fields
- [ ] Sketch the tool-use loop (receive → execute → send back → repeat)
- [ ] Guess the cost of a 2,000-token input / 500-token output call to Sonnet 4.6 within 20%
- [ ] Explain why streaming matters for UX even when total latency is unchanged

If any of these are fuzzy, spend a weekday revisiting before moving to Module 2.

---

## Daily 15-min tasks for this module

Rotate through these on weekday evenings:

- **Mon:** Read 1 blog post from [Simon Willison's LLM tag](https://simonwillison.net/tags/llms/) — 10 min
- **Tue:** Open a REPL, make one API call with a weird temperature/top_p combo, observe
- **Wed:** Pick one tool from your Week 4 project and rewrite its description to be 20% shorter
- **Thu:** Read one Anthropic cookbook example you haven't seen
- **Fri:** Code-review your own weekend project from a month ago (spaced repetition kicks in Week 5)

---

## ⏭️ Next up
**[Module 2 — Prompt Engineering + Evals](./02-prompts-evals.md)** — Weeks 5–8. This is where your QA instincts turn into an unfair advantage.
