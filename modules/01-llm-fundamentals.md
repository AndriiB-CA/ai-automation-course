# Module 1 — LLM API Fundamentals

**Weeks 2–4 · Phase 1: Foundations · ~18 hours total**

---

## Why this module matters

Before you can build agents, RAG systems, or AI-powered test tools, you need to be fluent with the raw API. Every abstraction you'll use later (Vercel AI SDK, Mastra, LangGraph) compiles down to the same three primitives: **messages, structured output, tool use**. Master them directly and every framework becomes easy.

**One API, any vendor.** This course uses the **OpenAI-compatible Chat Completions API**, which nearly every provider now speaks — OpenAI, xAI, Groq, Google, Anthropic, Ollama, and dozens more. You write against one request shape and change vendors by editing `.env`. Set yours up now: **[PROVIDERS.md](../PROVIDERS.md)**. The three primitives below are the same everywhere; where a provider differs, this course says so explicitly.

## Learning objectives

By the end of this module you will:
- Call any LLM API from TypeScript without a framework, and swap providers without touching code
- Stream responses token-by-token
- Force an LLM to return JSON that validates against a Zod schema
- Define tools an LLM can call, and handle the loop
- Know what each dollar of your API bill bought you

---

## Week 2 — Your First Real API Call

### Reading (90 min, spread across weekdays)
1. [Chat Completions API reference](https://platform.openai.com/docs/api-reference/chat) — the canonical spec every compatible provider implements. Skim the params, then focus on `messages`, `max_tokens`, `temperature`, `stream`, `tools`.
2. **Your own provider's docs** — whichever you picked in [PROVIDERS.md](../PROVIDERS.md). Find two pages and bookmark them: the **model list** and the **pricing page**. You will come back to both constantly, and they are the only copies that stay current.
3. **Your provider's pricing page — learn the shape, not the numbers.** Every vendor sells the same three-rung ladder: a small/fast model, a mid-tier workhorse, and a frontier model, with output tokens priced 3–5× input tokens and each rung 5–20× the one below. Write your model's two numbers into `.env` as `LLM_PRICE_IN_PER_MTOK` / `LLM_PRICE_OUT_PER_MTOK` and the starters will do the arithmetic for you.
4. Blog post: [A Brief Intro to LLM Inference (Chip Huyen)](https://huyenchip.com/2024/01/16/sampling.html)

### Videos (pick one, ~1 hour)
- 🎥 [Intro to LLMs — Andrej Karpathy (1h)](https://www.youtube.com/watch?v=zjkBMFhNj_g) — the mental model foundation
- 🎥 [Let's build the GPT Tokenizer — Andrej Karpathy (2h, skim the first 30 min)](https://www.youtube.com/watch?v=zduSFxRajkE) — pairs with the tokenization section below

### Tokens, tokenization & context windows (the units everything is priced in)

You'll say "token" fifty times a day in this job, so spend 30 minutes making it concrete instead of vibes.

**Tokenization** is how text becomes model input: a learned compression (BPE-family algorithms) that splits text into subword chunks from a fixed vocabulary. Common words are one token; rare words shatter into pieces. Consequences you'll hit in practice:

- **~4 characters ≈ 1 token in English prose** — the estimation rule of thumb, and *only* a rule of thumb
- **Code, JSON, and non-English text tokenize worse.** The same content in Japanese or as deeply-nested JSON can cost 1.5–3× the tokens of plain English. This is why "just send everything as JSON" quietly inflates your bill.
- **The model sees tokens, not letters.** The famous "how many r's in strawberry" failure is a tokenization artifact — the model never saw the individual characters. When output seems weirdly blind to spelling or exact character positions, this is why.
- **Every model family has its own tokenizer.** The same text produces *different counts* on GPT vs. Claude vs. Llama vs. Grok. The practical trap: **`tiktoken` is OpenAI's tokenizer** — using it to estimate another vendor's tokens can be off by 15–20%, worse on code. Two ways to get a real number: the `usage` block that comes back on every response (always available, but after the fact), or your provider's own token-counting endpoint if it has one (before the fact — Anthropic and Google both offer one; many providers don't).
- **Tokenizers change *between generations of the same family*.** This is not hypothetical: Claude's Opus 4.7 generation shipped a new tokenizer producing roughly 30% more tokens for identical text than its predecessor — a 30% cost increase at unchanged per-token prices. Any hardcoded "this prompt is ~3K tokens" assumption silently breaks on a model upgrade. Count, never estimate, in production code.

**Exercise (15 min):** Take three inputs — an English paragraph, that same paragraph as a JSON object, and a code snippet. Paste each into a [tokenizer playground](https://platform.openai.com/tokenizer) for GPT-family intuition, then send each to *your* provider and read `usage.prompt_tokens` off the response. Note both the JSON tax and the gap between the playground's count and your provider's. That 15 minutes permanently calibrates your cost instincts — and teaches you not to trust one vendor's tokenizer for another's bill.

**The context window** is the model's total working memory per request, measured in tokens — input *plus* output share it. Sizes vary by model and move fast: small models commonly sit at 128K–200K, and current flagships run 1M or more. Look up the number for the model you configured; don't carry an assumption over from a different one. Three things to internalize now:

1. **It's a hard budget, not a suggestion.** Exceed it and the request fails, or the response stops mid-generation with a length-related `finish_reason`. Production code checks size *before* sending — by counting tokens, not string length.
2. **Bigger ≠ free.** You pay per input token every request, and models attend less reliably to material buried in the middle of an enormous prompt than to its start and end. Stuffing 400K tokens of docs into every request is both expensive and *worse* than retrieving the relevant 2K.
3. **That tension — "my knowledge doesn't fit / doesn't belong in the window" — is exactly why RAG exists.** When you hit Week 9, remember this paragraph: retrieval is context-window management. Long-context and RAG are complements, not competitors.

> 🧪 **QA bridge:** Tokens are your load units. "Does it fit in the window" is a boundary test, `count_tokens` is your measurement oracle, and the cost-per-request estimate you'll do in the weekend project is performance budgeting. Treat the window like you treat a rate limit: test at the boundary, not just the happy path.

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
- [Zod documentation — Object schemas](https://zod.dev/?id=objects)
- [Function calling — OpenAI](https://platform.openai.com/docs/guides/function-calling) — the mechanism this course uses for structured output
- Skim your own provider's structured-output page, then read the compatibility table in [PROVIDERS.md](../PROVIDERS.md)

**The portability trap, and why this week matters more than it looks.** There are three ways to get JSON out of a model:

| Approach | How portable |
|---|---|
| Ask nicely in the prompt, parse the text | Everywhere — and unreliable everywhere |
| `response_format: { type: "json_schema" }` with `strict: true` | **Uneven.** Some providers enforce it, some accept the field and silently ignore it |
| **A forced tool call + your own validation** | Everywhere, and reliable |

The middle row is the dangerous one. A schema flag that is accepted and ignored gives you code that looks safe, passes review, and returns malformed data in production. Anthropic's compatibility layer documents that it ignores both `response_format` and `strict`; other providers vary.

So this course uses the third row: **define the shape as a tool, force the model to call it, parse the arguments, validate with Zod, and retry with the validation error when it fails.** Two schemas, two jobs — the tool schema steers the model, the Zod schema decides what you accept.

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
- [Function calling guide — OpenAI](https://platform.openai.com/docs/guides/function-calling) — the wire format
- [Function calling — your own provider's page](../PROVIDERS.md) — skim for what it does *not* support (`parallel_tool_calls`, `strict`, and forced `tool_choice` are the usual gaps)
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
2. If the response carries `tool_calls`, execute each one and append a `role: "tool"` message carrying the result and the matching `tool_call_id`
3. Loop until the response has no `tool_calls` — that's your final answer
4. Hard-cap at 10 iterations (prevent runaway loops!)

⚠️ **Every `tool_call` must get a reply before the next request.** Skip one — because you hit a budget cap mid-loop, say — and the conversation is malformed; most providers reject it outright. Finish the batch, *then* break.

Test questions to try:
- "What does this repo do?"
- "What are the three most recent open issues about memory leaks?"
- "Does this repo have any tests for authentication?"

### Key patterns to learn here
- **Tool schema design** — clear `description`, tight `parameters`
- **The agent loop** — the single most important 30-line function in AI engineering
- **Error handling in tools** — don't throw; return `{error: "..."}` so the LLM can recover
- **Budget the loop** — iteration count, token count, wall-clock time

### 🛡️ Security callout
Your tools run your code. What if the LLM decides to call `list_issues("../../etc/passwd", ...)`? Validate inputs **even when they come from an LLM**. Treat LLM output as untrusted user input. Week 23 formalizes this.

---

## Self-check before moving on

You should be able to, **without Googling**:

- [ ] Write a minimum `client.chat.completions.create` call from memory
- [ ] Point the same code at a second provider by changing only `.env`, and have it work
- [ ] Explain the difference between `temperature=0` and `temperature=1`
- [ ] Define a Zod schema for a nested object with optional fields
- [ ] Sketch the tool-use loop (receive → execute → send back → repeat), including where `tool_call_id` goes
- [ ] Guess the cost of a 2,000-token input / 500-token output call **on your own model** within 20%
- [ ] Name three request fields your provider silently ignores, and say how you found out
- [ ] Say why a forced tool call beats `response_format` for portable structured output
- [ ] Know that "reasoning effort" controls how much a model thinks before answering, that the parameter is **provider-specific** (`reasoning_effort`, `thinking`, …), and that compatibility layers commonly drop it
- [ ] Explain why streaming matters for UX even when total latency is unchanged
- [ ] Explain what a token is, why JSON and non-English text cost more, and why one vendor's tokenizer can't price another's bill
- [ ] State what a context window is, what happens when you exceed it, and why that's the reason RAG exists

If any of these are fuzzy, spend a weekday revisiting before moving to Module 2.

---

## Daily 15-min tasks for this module

Rotate through these on weekday evenings:

- **Mon:** Read 1 blog post from [Simon Willison's LLM tag](https://simonwillison.net/tags/llms/) — 10 min
- **Tue:** Open a REPL, make one API call with a weird temperature/top_p combo, observe
- **Wed:** Pick one tool from your Week 4 project and rewrite its description to be 20% shorter
- **Thu:** Point `LLM_BASE_URL` at a provider you haven't used yet and re-run one script. Note everything that broke
- **Fri:** Code-review your own weekend project from a month ago (spaced repetition kicks in Week 5)

---

## ⏭️ Next up
**[Module 2 — Prompt Engineering + Evals](./02-prompts-evals.md)** — Weeks 5–8. This is where your QA instincts turn into an unfair advantage.
