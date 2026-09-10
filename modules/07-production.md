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

1. ⭐ [Anthropic — Prompt Caching](https://docs.claude.com/en/docs/build-with-claude/prompt-caching) — read in full
2. [Anthropic — Message Batches API](https://docs.claude.com/en/docs/build-with-claude/batch-processing)
3. [Caching LLM API responses — Pinecone](https://www.pinecone.io/learn/series/vector-databases-in-production-for-busy-engineers/llm-caching/)
4. Blog: [How we reduced our OpenAI costs by 50% — Pulse AI](https://www.pulseapi.com/blog/reducing-llm-costs)

## Video (30 min)
- 🎥 [Prompt caching deep dive — Anthropic](https://www.youtube.com/watch?v=TBtojJ5qlzA)

---

## The four cost levers (in order of impact)

### 1. Model selection
You paid for Sonnet and Haiku has the same capability for your task. Always ask: can this step use Haiku? Benchmark it. Usually the answer is yes.

The 2026 ladder has four rungs — Haiku 4.5 ($1/$5) → Sonnet 5 ($2/$10) → Opus 5 ($5/$25) → Fable 5.1 ($10/$50) — and the discipline is to *earn* each step up with an eval, not vibes. The Fable tier exists for the hardest long-running agent work; most production pipelines never need to route above Opus 5, and most individual steps sit happily on Haiku or Sonnet. Note that Sonnet 5 costs *less* than the Sonnet 4.6 it replaced — when a new generation ships, re-check prices as well as capabilities.

One more 2026 lever inside a single model: Claude 5 models use **adaptive thinking**, controlled by the `effort` parameter (defaults to `high` on the API). Dropping `effort` on simple, high-volume steps cuts latency and output tokens without changing models — benchmark it the same way you benchmark a model downgrade.

### 2. Prompt caching
For repeated system prompts, examples, and context windows:
```ts
const msg = await client.messages.create({
  model: "claude-sonnet-5",
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
First call: full price. Cached cache reads: ~10% of original price. Within 5 minutes. Saves huge money on any loop that reuses a system prompt.

### 3. Batch API
For anything that doesn't need real-time response (evals, bulk ingestion, async processing):
```ts
// Submit batch
const batch = await client.messages.batches.create({
  requests: myRequests  // up to 10,000
});
// Poll / webhook for completion
```
50% discount. Runs within 24 hours. Perfect for eval suites and nightly regenerations.

### 4. Response caching
When users ask the same (or semantically similar) question:
- Exact-match cache: simple hash of prompt → response (Redis, KV store)
- Semantic cache: embed the query, if a cached query is ≥0.95 similar, return its response

Redis LangCache or a simple pgvector-backed cache both work. Semantic caching delivers up to 73% cost reduction on high-repetition workloads; cache hits return in milliseconds.

### 5. Model routing
Route simple queries to cheaper models automatically. Haiku 4.5 handles 60–80% of typical production queries with identical user-perceived quality. Teams that implement routing report 40–60% reduction in total token spend. Simple heuristic: if the query is under N tokens and contains no code/structured data, try Haiku first; fall back to Sonnet on validation failure.

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
For each LLM call in your pipeline, ask: does this need Sonnet? Try Haiku. Re-run evals. If quality stays ≥95% of baseline, ship it.

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

The most realistic maintenance task in this field isn't building something new — it's upgrading a running system when a new model generation ships (Claude 4 → 5, and the one after that). Practice it on your own project *before* an employer asks you to do it on theirs:

1. **Branch**, then swap every model ID in one project to the current generation (`grep -rn "claude-" src/` finds them all — if that grep is painful, that's finding number one: centralize your model IDs in one config file).
2. **Re-run your eval suite** from Module 2 against both branches. Diff pass rates per test case, not just the aggregate.
3. **Re-run your cost baseline** (Step 1 above) on both. New generations change tokenizers and verbosity, so cost per request can move in either direction even at identical per-token prices.
4. **Write the migration verdict** in three lines: quality delta, cost delta, and go/no-go. That artifact — "I upgraded, measured, and shipped/rolled back" — is a senior-engineer signal in interviews.

The QA framing: a model upgrade is a **dependency bump with non-deterministic behavior change**. Nobody merges those without a regression suite. Your evals *are* that suite.

---

## Cost alerts (set these today)

### Anthropic Console
- Settings → Limits → monthly usage cap
- Add a daily alert email

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

- [ ] You can quote the pricing of Haiku 4.5, Sonnet 5, Opus 5 within 20%
- [ ] You've measured a >50% cost reduction on one of your projects
- [ ] You have a cost alert set in the Anthropic console
- [ ] Your main projects have a response cache layer

---

## Daily 15-min tasks

- **Mon:** Check your Anthropic usage dashboard. Anything unexpected?
- **Tue:** Swap one Sonnet call to Haiku in a side project. Does quality survive?
- **Wed:** Read one [Latent Space post on production LLM ops](https://www.latent.space/)
- **Thu:** Look at one Langfuse trace. Find the most expensive single call. Why is it so big?
- **Fri:** Add `cache_control` to one more system prompt

---

## ⏭️ Next up
**[Module 8 — AI Security](./08-security.md)** — Week 23. Ship safely. Red-team your own work.
