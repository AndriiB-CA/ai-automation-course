# Module 7 — Production & Cost Engineering

**Week 22 · Phase 3: Ship · ~6 hours total**

---

## Why this module matters

Prototypes are fun. Production bills are not. The difference between "cool demo" and "real product" is usually a 10× cost/latency improvement. This week you'll retrofit your prior work to be production-worthy — the practice that makes your capstone ship-able in Week 24.

## Learning objectives

- Apply prompt caching to cut costs by up to 90% on repeated prefixes
- Use batch APIs for non-urgent workloads (50% discount)
- Implement semantic response caching for hot paths
- Know when streaming helps and when it hurts
- Set cost alerts that actually catch problems

---

## Reading (3 hours, front-loaded)

1. ⭐ **Your provider's prompt-caching docs** — read in full. Every major vendor has this feature; the shapes differ ([Anthropic](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) uses explicit `cache_control` markers, [OpenAI](https://platform.openai.com/docs/guides/prompt-caching) caches automatically on long prefixes, others vary). Read one other vendor's page too, so you can tell the concept from the API.
2. **Your provider's batch API docs** — the ~50% discount for non-urgent work is near-universal; the endpoint is not.
3. [Caching LLM API responses — Pinecone](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/llm-caching/)
4. Blog: [How we reduced our OpenAI costs by 50% — Pulse AI](https://www.pulseapi.com/blog/reducing-llm-costs)

## Video (30 min)
- 🎥 [Prompt caching deep dive](https://www.youtube.com/watch?v=TBtojJ5qlzA) — one vendor's, but the mechanics generalise

---

## The four cost levers (in order of impact)

### 1. Model selection
You paid for the mid-tier model and the small one has the same capability for your task. Always ask: can this step use the cheap model? Benchmark it. Usually the answer is yes.

Every vendor sells the same ladder, and the *ratios* between rungs are far more stable than the prices:

| Rung | Typical use | Relative cost |
|---|---|---|
| **Open-weight on a fast host** (Groq, Together, or local Ollama) | classification, routing, extraction, first-pass filtering | 1× (baseline; local is free per token) |
| **Small / fast** (every vendor's cheapest hosted tier) | summarisation, simple structured output | ~2–10× |
| **Mid-tier workhorse** | most production work | ~10–30× |
| **Frontier** | hard reasoning, long-running agents, judging other models | ~50–200× |

The discipline is to *earn* each step up with an eval, not vibes. Most pipelines never need the top rung, and most individual steps sit happily on the bottom two. That is what `LLM_MODEL` and `LLM_MODEL_SMALL` are for — configure both and route deliberately.

Two things that surprise people, both worth internalising:

- **A new generation is not automatically more expensive.** Vendors have shipped better models at *lower* prices more than once. When a generation lands, re-check price as well as capability — the migration might pay for itself.
- **A new generation can cost more at identical per-token prices**, because tokenizers change between generations and the same text becomes more tokens. Measure spend per *request*, not per token.

One more lever inside a single model: most frontier models now expose some **reasoning-effort** control — how much the model thinks before answering. Dialling it down on simple, high-volume steps cuts latency and output tokens without changing models. The catch is that this parameter is thoroughly **provider-specific** (`reasoning_effort`, `thinking`, and others) and is one of the fields OpenAI-compatible layers most often ignore. Verify it took effect by watching output-token counts move — not by reading the docs.

### 2. Prompt caching
For repeated system prompts, examples, and context windows. **This is provider-native** — the example below is one vendor's syntax, and prompt caching is generally *not* carried by OpenAI-compatible layers. It is the clearest case in this course for a deliberate escape hatch: keep the portable path, put the native call behind one function, and write down what it buys you.


```ts
const msg = await client.messages.create({
  model: process.env.LLM_MODEL,
  max_tokens: 1024,
  system: [
    {
      type: "text",
      text: MY_LARGE_SYSTEM_PROMPT,
      cache_control: { type: "ephemeral" }  // 👈
    }
  ],
  messages: [{ role: "user", content: userInput }]
});
```
First call: full price. Cached reads: roughly 10% of the original input price, within a short TTL. Vendors differ on whether you mark the cache boundary explicitly or they detect long repeated prefixes automatically — check yours. Either way it saves serious money on any loop that reuses a system prompt.

### 3. Batch API
For anything that doesn't need real-time response (evals, bulk ingestion, async processing):
```ts
// Submit batch
const batch = await client.messages.batches.create({
  requests: myRequests  // up to 10,000
});
// Poll / webhook for completion
```
Around a 50% discount, typically within 24 hours. Near-universal as a concept; the endpoint shape is vendor-specific, so this is another deliberate escape hatch. Perfect for eval suites and nightly regenerations.

### 4. Response caching
When users ask the same (or semantically similar) question:
- Exact-match cache: simple hash of prompt → response (Redis, KV store)
- Semantic cache: embed the query, if a cached query is ≥0.95 similar, return its response

Redis LangCache or a simple pgvector-backed cache both work. Semantic caching delivers up to 73% cost reduction on high-repetition workloads; cache hits return in milliseconds.

### 5. Model routing
Route simple queries to cheaper models automatically. A small model handles 60–80% of typical production queries with identical user-perceived quality, and teams that implement routing report 40–60% reductions in total token spend. Simple heuristic: if the query is short and contains no code or structured data, try `LLM_MODEL_SMALL` first; fall back to `LLM_MODEL` on validation failure.

Routing *across providers* is the same code — the fallback client just has a different `baseURL`. That makes a second provider a cheap insurance policy against one vendor's outage or rate limit, not just a cost lever.

---

## Weekend project (4 hours)

Pick your **most-used prior project** (likely Week 12 RAG app or Week 15 research agent). Retrofit production-grade cost engineering:

**Step 1 (30 min) — Baseline**
Run 50 realistic requests. Record:
- Total cost
- Median latency
- p95 latency
- Request failure rate

**Step 2 (60 min) — Model optimization**
For each LLM call in your pipeline, ask: does this need the mid-tier model? Try `LLM_MODEL_SMALL`. Re-run evals. If quality stays ≥95% of baseline, ship it. Then try an open-weight model on a fast host for the same step and re-measure — that is often another 5–20× down.

**Step 3 (60 min) — Prompt caching**
Mark large static prefixes with `cache_control`. Re-run the 50 requests. Record savings.

**Step 4 (60 min) — Response caching**
Add a simple LRU cache keyed by normalized query. For RAG, key by `(query, top_k_doc_ids)`.

**Step 5 (30 min) — Measure & report**
Re-run the benchmark. Write a markdown report:
```
| Metric           | Before   | After    | Delta  |
|------------------|----------|----------|--------|
| Cost (50 reqs)   | $2.14    | $0.31    | -86%   |
| Median latency   | 3.2s     | 1.1s     | -66%   |
| p95 latency      | 8.7s     | 2.4s     | -72%   |
```

🎯 **This report is portfolio material.** Tweet it. It proves you can take something to production.

### Stretch — the model-migration drill (2 hours, do this once per model generation)

The most realistic maintenance task in this field isn't building something new — it's upgrading a running system when a new model generation ships. Practice it on your own project *before* an employer asks you to do it on theirs. Do it twice: once to a newer model from the same vendor, once to a **different vendor entirely** — the second is where you find out what you accidentally depended on:

1. **Branch**, then swap the model. If you followed this course's convention it is one line in `.env`; if it is a `grep -rn` across `src/`, that's finding number one — centralise your model IDs in one config file before going further.
2. **Re-run your eval suite** from Module 2 against both branches. Diff pass rates per test case, not just the aggregate.
3. **Re-run your cost baseline** (Step 1 above) on both. New generations change tokenizers and verbosity, so cost per request can move in either direction even at identical per-token prices.
4. **Write the migration verdict** in three lines: quality delta, cost delta, and go/no-go. That artifact — "I upgraded, measured, and shipped/rolled back" — is a senior-engineer signal in interviews.

The QA framing: a model upgrade is a **dependency bump with non-deterministic behavior change**. Nobody merges those without a regression suite. Your evals *are* that suite.

---

## Cost alerts (set these today)

### Your provider's console
Every major provider has a spend cap and a usage alert. Find both today — this is a five-minute task that has saved people four-figure surprises:
- A hard monthly usage cap
- A daily alert email at a threshold you'd want to know about

### Your code
Wrap every LLM call in a cost-logger:
```ts
async function trackedMessage(params) {
  const start = Date.now();
  const msg = await client.messages.create(params);
  const cost = computeCost(msg.usage, params.model);
  logger.info({ cost, tokens: msg.usage, latency_ms: Date.now() - start });
  if (cost > 0.50) logger.warn("Expensive call", { params, cost });
  return msg;
}
```

### CI costs
In your GitHub Actions eval workflow:
```yaml
- name: Fail if eval cost too high
  run: |
    COST=$(jq '.stats.totalCost' results.json)
    if (( $(echo "$COST > 5.00" | bc -l) )); then
      echo "::error::Eval cost $COST exceeded $5 threshold"
      exit 1
    fi
```

---

## When streaming hurts

You might think: "streaming always wins." Not so.

**Streaming wins:**
- User-facing chat where first token matters for perceived latency
- Long outputs (>500 tokens)

**Streaming loses:**
- You need the full response before doing anything (e.g., parsing JSON)
- Your client doesn't cleanly handle backpressure
- Debugging — full response is easier to inspect

Know your use case. Don't stream reflexively.

---

## Self-check

- [ ] You can quote your own model's input and output price within 20%, and name a model one rung cheaper
- [ ] You can name which cost levers on this page are portable and which are provider-native
- [ ] You've measured a >50% cost reduction on one of your projects
- [ ] You have a spend cap and a cost alert set on your provider's console
- [ ] Your main projects have a response cache layer

---

## Daily 15-min tasks

- **Mon:** Check your provider's usage dashboard. Anything unexpected?
- **Tue:** Swap one call to `LLM_MODEL_SMALL` in a side project. Does quality survive?
- **Wed:** Read one [Latent Space post on production LLM ops](https://www.latent.space/)
- **Thu:** Look at one Langfuse trace. Find the most expensive single call. Why is it so big?
- **Fri:** Add `cache_control` to one more system prompt

---

## ⏭️ Next up
**[Module 8 — AI Security](./08-security.md)** — Week 23. Ship safely. Red-team your own work.
