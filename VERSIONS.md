# 📌 Freshness ledger

AI moves fast; this course pins its fast-moving claims here so they can be re-verified on a schedule instead of rotting silently. **Cadence: re-check this table every ~3 months** (or whenever a major model generation ships) and update the modules it points to.

**Last full verification: 2026-09-10**

> 🤖 **Working on this repo with an AI agent?** Read [AGENTS.md](./AGENTS.md) first — it explains why this file exists and the rule that matters most: never write a model ID, price, or "current best practice" from memory.

---

## What this file does *not* track

**Model IDs and prices are deliberately absent from this repo**, so there is nothing here to keep current.

The course is provider-neutral: model names and per-token prices live in each learner's `.env`, sourced from their own provider's page. That is the only copy that cannot go stale. A price table published here would be wrong within months, and a wrong price is worse than no price because the reader trusts it.

What the course teaches instead is the **shape** — the small→mid→frontier ladder, the 3–5× output-to-input ratio, the 5–20× gap between rungs. Those relationships have held across every vendor and every generation so far.

If you find a hardcoded model ID or dollar figure anywhere outside a clearly-labelled example, that's a bug. See "Facts that expire" in [AGENTS.md](./AGENTS.md).

---

## Fast-moving claims and where they live

| Claim | Where it's taught | Verified | Re-verify at |
|---|---|---|---|
| **Provider base URLs** — xAI `api.x.ai/v1`, Groq `api.groq.com/openai/v1`, Ollama `localhost:11434/v1`, OpenAI `api.openai.com/v1`, Google `generativelanguage.googleapis.com/v1beta/openai/`, Anthropic `api.anthropic.com/v1/`, OpenRouter `openrouter.ai/api/v1` | PROVIDERS.md, all `.env.example` | 2026-09-10 | each provider's own API docs |
| **Compatibility gaps:** `tools` portable; `response_format` / `strict` / `seed` / reasoning-effort uneven; prompt caching provider-native | PROVIDERS.md, Modules 1, 7 | 2026-09-10 | [Anthropic compat layer](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk), [Gemini OpenAI compat](https://ai.google.dev/gemini-api/docs/openai), each provider's compat page |
| Anthropic's OpenAI-compat layer is positioned for **testing and comparison, not production**, and drops `response_format`, `strict`, and prompt caching | PROVIDERS.md, Module 1 Week 3 | 2026-09-10 | [same](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk) |
| Google's OpenAI endpoint serves **Chat Completions and Embeddings only** | PROVIDERS.md, Module 3 | 2026-09-10 | [ai.google.dev](https://ai.google.dev/gemini-api/docs/openai) |
| Embeddings are less widely served than chat; xAI and Groq are chat-only | PROVIDERS.md, Module 3, TOOLS.md | 2026-09-10 | provider docs |
| Tokenizers change between generations of the same family — a documented case produced ~30% more tokens for identical text | Module 1 | 2026-09-10 | vendor release notes |
| Batch APIs ≈ 50% discount, near-universal as a concept | Modules 7, 14 | 2026-09-10 | provider pricing pages |
| `openai` SDK pinned at `^7.15.0`; `zod` at `^3.24.0` with `zod-to-json-schema` | all `code/*/package.json` | 2026-09-10 | `npm view openai version` |
| pgvector 0.8.0+ iterative index scans (~5.7× faster filtered queries) | Module 3, TOOLS.md | 2026-07 | [pgvector releases](https://github.com/pgvector/pgvector/releases) |
| MCP: Linux Foundation donation (Dec 2025), 9,400+ public servers, 78% enterprise adoption | Module 4, TOOLS.md | 2026-07 | [modelcontextprotocol.io](https://modelcontextprotocol.io/) |
| Playwright Agents (v1.56+, Oct 2025): NL test-gen + self-healing. `page.accessibility` is removed — use `locator.ariaSnapshot()` | Module 5, TOOLS.md, week-20 starter | 2026-09-10 | [Playwright release notes](https://playwright.dev/docs/release-notes) |
| OWASP LLM Top 10 (2025) + OWASP Agentic Top 10 (2026) as the security taxonomies | Modules 8, 11 | 2026-07 | [genai.owasp.org](https://genai.owasp.org/) |
| DOM-driven browser agents ~12–17 pp more reliable than pure vision | Module 5 | 2026-07 | re-search current benchmarks |
| AGENTS.md is the cross-tool context-file standard | Modules 12, 16; repo root | 2026-09-09 | [agents.md](https://agents.md) |
| US salary band ~$86K–$204K+, median ~$135K for AI automation roles | Module 15 | 2026-07 | current salary aggregators |

---

## How to run a refresh

1. Open each "Re-verify at" link and compare against the claim. **Check the live source — do not answer from what you already believe.**
2. If a claim drifted, `grep` the "Where it's taught" locations.
3. **Check nobody has reintroduced a hardcoded model ID or price.** This is the regression that matters most now that the course is provider-neutral:
   ```bash
   # Should return only clearly-labelled examples and PROVIDERS.md prose
   grep -rnE '(claude|gpt|gemini|grok|llama)-[0-9]' --include="*.ts" --include="*.md" \
     --include="*.yaml" --exclude-dir=node_modules .
   grep -rnE '\$[0-9]+(\.[0-9]+)?/\$[0-9]+' --include="*.md" --exclude-dir=node_modules .
   ```
4. Re-typecheck the starters after any SDK bump: `npm ci && npx tsc --noEmit` in each project listed in `.github/workflows/starters-typecheck.yml`.
5. Update the **Verified** column and the date at the top.

> 🧪 **QA bridge:** this file is a regression suite for course content. Same discipline as golden data — a claim without a re-verification pointer is a test without an assertion. And the best fix for a flaky assertion is to delete the thing that made it flaky: that is exactly why model IDs and prices no longer live in this repo at all.
