# 📌 Freshness ledger

AI moves fast; this course pins its fast-moving claims here so they can be re-verified on a schedule instead of rotting silently. **Cadence: re-check this table every ~3 months** (or whenever a major model generation ships) and update the modules it points to.

**Last full verification: 2026-07-26**

---

## Fast-moving claims and where they live

| Claim | Where it's taught | Verified | Re-verify at |
|---|---|---|---|
| Claude lineup: Fable 5 ($10/$50), Opus 5 ($5/$25), Sonnet 5 ($3/$15), Haiku 4.5 ($1/$5); 1M ctx on flagships | Module 1, Module 7, code starters | 2026-07-26 | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |
| ⚠️ **Sonnet 5 intro pricing $2/$10 ends Aug 31, 2026** — Module 1 already quotes the standard $3/$15 | Module 1 | 2026-07-26 | [Pricing](https://docs.claude.com/en/docs/about-claude/pricing) |
| Adaptive thinking + `effort` param (defaults `high` on API) replaced extended thinking on Claude 5 models | Modules 1, 7 | 2026-07-26 | [Thinking docs](https://platform.claude.com/docs/en/build-with-claude/thinking) |
| Opus 4.7+ tokenizer produces ~30% more tokens than earlier Claude models | Module 1 | 2026-07-26 | [Models overview](https://platform.claude.com/docs/en/about-claude/models/overview) |
| `@anthropic-ai/sdk` pinned at `^0.115.0` | `code/module-14-idp`, `code/module-12-multi-agent` | 2026-07-26 | `npm view @anthropic-ai/sdk version` |
| Embeddings pick: `voyage-3-large` / `voyage-3.5-lite`; OpenAI `text-embedding-3-large` as alternative | Module 3, TOOLS.md | 2026-07 | [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) |
| pgvector 0.8.0+ iterative index scans (~5.7× faster filtered queries) | Module 3, TOOLS.md | 2026-07 | [pgvector releases](https://github.com/pgvector/pgvector/releases) |
| MCP: Linux Foundation donation (Dec 2025), 9,400+ public servers, 78% enterprise adoption | Module 4, TOOLS.md | 2026-07 | [modelcontextprotocol.io](https://modelcontextprotocol.io/) |
| Playwright Agents (v1.56+, Oct 2025): NL test-gen + self-healing | Module 5, TOOLS.md | 2026-07 | [Playwright release notes](https://playwright.dev/docs/release-notes) |
| OWASP LLM Top 10 (2025) + OWASP Agentic Top 10 (2026) as the security taxonomies | Modules 8, 11 | 2026-07 | [genai.owasp.org](https://genai.owasp.org/) |
| DOM-driven browser agents ~12–17 pp more reliable than pure vision | Module 5 | 2026-07 | re-search current benchmarks |
| US salary band ~$86K–$204K+, median ~$135K for AI automation roles | Module 15 | 2026-07 | current salary aggregators |

---

## How to run a refresh

1. Open each "Re-verify at" link and compare against the claim.
2. If a claim drifted, `grep` the "Where it's taught" locations (model IDs are the usual suspects: `grep -rn "claude-" modules/ code/ --include="*.md" --include="*.ts" --include="*.yaml"`).
3. Re-typecheck the starters after any SDK bump: `npx tsc --noEmit` in `code/module-14-idp` and `code/module-12-multi-agent`.
4. Update the **Verified** column and the date at the top.

> 🧪 **QA bridge:** this file is a regression suite for course content. Same discipline as golden data — a claim without a re-verification pointer is a test without an assertion.
