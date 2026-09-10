# 🔌 Providers — one API, any model

This course is **provider-neutral**. Every starter project talks to a model through the
**OpenAI-compatible Chat Completions API**, which almost every vendor now speaks. Swapping
providers is a change to your `.env` file, not to your code.

```ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey:  process.env.LLM_API_KEY,
  baseURL: process.env.LLM_BASE_URL,
});
```

That is the whole trick. Pick a provider below, paste three lines into `.env`, and every
project in `/code` runs.

---

## The four environment variables

Every starter reads the same four variables. Set them once in your shell profile and they
apply to the whole course.

| Variable | What it is | Example |
|---|---|---|
| `LLM_BASE_URL` | Your provider's OpenAI-compatible endpoint | `https://api.x.ai/v1` |
| `LLM_API_KEY` | Your key for that provider | `xai-...` |
| `LLM_MODEL` | The model ID for normal work | *from your provider's model list* |
| `LLM_MODEL_SMALL` | A cheaper/faster model for high-volume steps | *the cheapest one they serve* |

Two optional variables turn on cost reporting (see [Cost math](#cost-math-without-a-price-table)):

| Variable | What it is |
|---|---|
| `LLM_PRICE_IN_PER_MTOK` | USD per million **input** tokens for `LLM_MODEL` |
| `LLM_PRICE_OUT_PER_MTOK` | USD per million **output** tokens for `LLM_MODEL` |

> **Why `LLM_MODEL` has no default.** The starters fail fast with a readable error if it is
> unset, rather than guessing. Model IDs change every few months; a hardcoded default is a
> landmine that produces a confusing 404 six months from now. Naming your own model is the
> five seconds that prevents it.

---

## Base URLs

Verified 2026-09-10. Endpoint URLs are stable — model IDs are not, which is why none appear
below. Open your chosen provider's model list and pick a current one.

| Provider | `LLM_BASE_URL` | Key from | Notes |
|---|---|---|---|
| **xAI (Grok)** | `https://api.x.ai/v1` | [console.x.ai](https://console.x.ai) | Full chat + tools. Long context. |
| **Groq** | `https://api.groq.com/openai/v1` | [console.groq.com](https://console.groq.com) | Open-weight models on LPU hardware — very fast, very cheap, **has a free tier**. |
| **Ollama** (local) | `http://localhost:11434/v1` | any string, e.g. `ollama` | Runs on your laptop. Free, offline, no key. |
| **OpenAI** | `https://api.openai.com/v1` | [platform.openai.com](https://platform.openai.com/api-keys) | The reference implementation. |
| **Google (Gemini)** | `https://generativelanguage.googleapis.com/v1beta/openai/` | [aistudio.google.com](https://aistudio.google.com/apikey) | Generous free tier. |
| **Anthropic (Claude)** | `https://api.anthropic.com/v1/` | [platform.claude.com](https://platform.claude.com/settings/keys) | See the compatibility caveat below. |
| **OpenRouter** | `https://openrouter.ai/api/v1` | [openrouter.ai](https://openrouter.ai/keys) | One key, hundreds of models from every vendor. Useful for comparison work. |

Anything else that advertises an "OpenAI-compatible endpoint" — Together, Fireworks, DeepSeek,
Mistral, vLLM, LM Studio, Azure OpenAI, AWS Bedrock gateways — works the same way. Find their
base URL, put it in `LLM_BASE_URL`, done.

### Recommended starting points

- **Free, no credit card:** Groq or Google AI Studio. Both have real free tiers big enough for
  this course's exercises.
- **Free, fully offline:** Ollama. Slower and weaker at tool use, but nothing leaves your
  laptop — which matters for Module 8's security exercises and for anyone whose employer
  forbids sending code to a third party.
- **Best capability for agent work (Modules 4, 5, 12):** any current frontier model from xAI,
  OpenAI, Anthropic, or Google. Agent loops are where weak models fall apart.

You will want **at least two** providers configured by Week 7. Comparing models is half of
what evals are for, and you cannot compare one thing.

---

## Compatibility is a spectrum, not a switch

"OpenAI-compatible" means the *shape* of the request matches. It does not mean every field is
honoured. Providers differ in what they silently ignore, and **silently** is the dangerous
part — a field that is dropped without an error produces a working request with wrong
behaviour.

This matters for three specific things this course teaches:

| Feature | Portable? | What to do instead |
|---|---|---|
| **`tools` / function calling** | ✅ Broadly supported | Use it. This is the most portable structured-output mechanism there is. |
| **`response_format: json_schema`** | ⚠️ Uneven | Don't depend on it. Use tool calling + **Zod validate-and-retry** (Module 1, Week 3). Works everywhere. |
| **`strict: true` schema enforcement** | ⚠️ Uneven | Same — validate the output yourself. Never trust a schema flag you didn't test. |
| **Prompt caching** | ❌ Provider-native | Real savings, but you need the vendor's own SDK. See "escape hatches" below. |
| **Reasoning / thinking controls** | ❌ Provider-native | Names and shapes differ per vendor (`reasoning_effort`, `thinking`, …). Provider-native. |
| **`seed`, `logprobs`, `logit_bias`** | ⚠️ Often ignored | Don't build determinism assumptions on them. |
| **`temperature` range** | ⚠️ Differs | Some providers cap at 1.0, others accept 2.0. Stay in `0.0–1.0` and you are safe everywhere. |

Documented examples, so you know this is real and not hypothetical:

- **Anthropic's** compatibility layer is [explicitly positioned for testing and comparison,
  not production](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk).
  It ignores `response_format`, ignores `strict`, does not support prompt caching, and
  concatenates all system/developer messages into one leading system message.
- **Google's** OpenAI endpoint exposes [Chat Completions and Embeddings
  only](https://ai.google.dev/gemini-api/docs/openai) — the rest of the Gemini feature surface
  needs the native SDK.
- **Groq** returns a `400` for unsupported fields rather than ignoring them, which is friendlier
  but means code written against another provider can hard-fail on the swap.
- **Ollama** describes its `/v1` surface as experimental; use `/api` for its full feature set.

> 🧪 **QA bridge:** this table is a **compatibility matrix**, and you have written these before.
> The same discipline applies: never assume a capability is present because the type signature
> accepts it. Send one request per provider and assert on the response. Week 7's eval harness is
> where this stops being manual.

### Escape hatches (using a provider's native features on purpose)

Portability is a default, not a religion. When a provider-specific feature is worth real money
or real latency — prompt caching is the usual one — take it, but take it deliberately:

1. Keep the portable path as the fallback, so the project still runs on any provider.
2. Put the native call behind one function, in one file, so the coupling has an address.
3. Write down which provider you optimised for and what it buys you.

Module 7 walks through this with prompt caching as the worked example.

---

## Cost math without a price table

This course deliberately does **not** publish a cross-provider price table. Prices change on
no schedule, vary by context length and tier, and any table printed here would be wrong before
you read it — and wrong pricing is worse than no pricing, because you'll trust it.

Instead: **look up your two numbers once, put them in `.env`, and let the code do arithmetic.**

```bash
# from your provider's pricing page, in USD per million tokens
LLM_PRICE_IN_PER_MTOK=2.00
LLM_PRICE_OUT_PER_MTOK=6.00
```

Every starter that reports cost reads those two variables. If they are unset it prints token
counts and skips the dollar figure, rather than lying to you.

Official pricing pages:

| Provider | Pricing |
|---|---|
| xAI | <https://x.ai/api> |
| Groq | <https://groq.com/pricing> |
| Ollama | free (your electricity) |
| OpenAI | <https://openai.com/api/pricing/> |
| Google | <https://ai.google.dev/pricing> |
| Anthropic | <https://platform.claude.com/docs/en/about-claude/pricing> |
| OpenRouter | <https://openrouter.ai/models> |

The **relationships** between prices are what the course actually teaches, and those are stable
even as the absolute numbers move:

- A frontier model costs roughly **5–20×** what a small model from the same vendor costs.
- **Output tokens cost more than input tokens** — typically 3–5×. Verbose responses are the
  expensive kind.
- Open-weight models on fast inference hosts are **another 5–20× cheaper** than frontier models,
  and are perfectly good at classification, extraction, and routing.
- Local inference is **free per token** and costs you latency and capability instead.

That ladder — small → mid → frontier, escalating only when an eval says you must — is the
lesson. The specific dollar figures are just today's instance of it.

---

## Picking a model, per phase of the course

You do not need one model for everything. A useful default:

| Course phase | What it needs | Reasonable choice |
|---|---|---|
| Modules 1–2 (fundamentals, prompts, evals) | Cheap, high volume, fast iteration | A small model. Groq's free tier is ideal here. |
| Module 3 (RAG) | Decent synthesis + an embeddings endpoint | Mid-tier. Check your provider has embeddings — not all compat endpoints do. |
| Modules 4, 5, 12 (agents, browser agents, multi-agent) | Reliable multi-step tool use | Frontier tier. This is where weak models visibly fail. |
| Modules 6–7 (AI QA, production) | Both — you are comparing them | At least two providers configured. |
| Module 8 (security) | Anything, including local | Ollama is a good choice: red-teaming your own prompts offline. |

> ⚠️ **Embeddings are less portable than chat.** The `/embeddings` endpoint exists on OpenAI,
> Google, and Ollama, but not on every chat provider — xAI and Groq are chat-focused. Module 3
> tells you to configure a **separate** `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` for exactly
> this reason. Mixing a Groq chat model with Ollama embeddings is normal and fine.

---

## Verifying your setup

From any starter directory:

```bash
npm run check-provider
```

It sends one trivial request, prints the model that answered, token counts, and — if you set
the price variables — the cost. If that works, every project in this course works.

If it doesn't, in order of likelihood: the base URL is missing `/v1`, the model ID is stale, or
the key belongs to a different provider than the base URL.

---

## Keeping this file honest

Base URLs and compatibility gaps are pinned in [VERSIONS.md](./VERSIONS.md) with re-verification
dates. Model IDs and prices deliberately are not pinned anywhere in this repo — they live in
your `.env`, sourced from the provider's own page, which is the only copy that can't go stale.

If you are an AI agent editing this repo, read [AGENTS.md](./AGENTS.md) first — particularly
"Facts that expire."
