# AGENTS.md — working in this repository

Instructions for any AI coding agent or LLM working on this repo. This file follows the open [AGENTS.md](https://agents.md) convention and is **tool-neutral**: Claude Code, Cursor, Codex, Copilot, Gemini CLI, Aider, Windsurf, Cline, and anything else that reads a repo context file should treat it as the source of truth. It is written to be readable by a human too.

If your tool prefers a different filename, symlink or copy this file rather than maintaining a second set of rules.

---

## What this repository is

A **course**, not an application. It teaches a working QA/Playwright engineer to become an AI Automation Engineer over 28 weeks (24 core + 4 bonus). The deliverables are teaching materials plus runnable starter code.

Nothing here is a library or a service. There is no application to run, no test suite to make green, and no user-facing feature work. Most changes are **content edits** — and the bar for content is factual accuracy plus consistency with the established house style.

## Layout

| Path | What it is |
|---|---|
| `README.md` | Entry point and course pitch |
| `ROADMAP.md` | Week-by-week plan (weeks 1–28) |
| `SETUP.md` | Learner environment setup |
| `VERSIONS.md` | **Freshness ledger** — fast-moving claims with last-verified dates. See "Facts that expire" below |
| `PROVIDERS.md` | The provider contract: OpenAI-compatible base URLs, the `LLM_*` env convention, the compatibility matrix |
| `modules/NN-*.md` | The 17 course modules (00–16). The main content |
| `code/week-NN-*/`, `code/module-NN-*/` | Runnable starter projects (TypeScript, some Python notebooks) |
| `daily-tasks/`, `resources/` | Practice prompts and curated tool/video/community lists |
| `index.html` | The interactive portal — single file, inline CSS + JS, no build step |
| `viewer.html` | Markdown renderer the portal links to |
| `wrangler.jsonc` | Cloudflare Workers static-asset deploy (`assets.directory` is the repo root) |
| `.github/workflows/` | CI: typechecks the two starter projects with lockfiles |

## Verify your changes

There is no single build. Run whichever applies to what you touched:

```bash
# Every starter with a package.json + lockfile + tsconfig (what CI runs).
# The full list lives in .github/workflows/starters-typecheck.yml.
for d in code/capstone-playwright-healer code/module-12-multi-agent code/module-14-idp \
         code/week-02-first-api-call code/week-10-rag-pgvector code/week-15-mcp-agent \
         code/week-20-ai-test-generator; do
  ( cd "$d" && npm ci --silent && npx tsc --noEmit ) || echo "FAILED: $d"
done

# The portal's inline script — extract, then syntax-check it
awk '/<script>/{f=1;next} /<\/script>/{f=0} f' index.html > /tmp/portal.js && node --check /tmp/portal.js

# Relative links in markdown — prints nothing when they all resolve
grep -rhoE '\]\(\.{1,2}/[^)#]+' --include="*.md" --exclude-dir=node_modules . | sed 's/^](//' | sort -u | while read -r l; do
  base=$(grep -rl "]($l" --include="*.md" --exclude-dir=node_modules . | head -1)
  [ -e "$(dirname "$base")/$l" ] || echo "MISSING: $l (in $base)"
done
```

```bash
# No hardcoded model IDs or prices should exist outside labelled examples
grep -rnE '(claude|gpt|gemini|grok|llama)-[0-9]' --include="*.ts" --include="*.md" \
  --include="*.yaml" --exclude-dir=node_modules .
```

`code/week-06-structured-tools`, `code/week-07-promptfoo-evals` and `code/week-18-browser-agent` are illustrative snippets without a package.json — do not add CI for them without being asked.

## Conventions that matter

**Module house style.** Every file in `modules/` follows this shape. Match it exactly when adding or editing sections:

```markdown
# Module N — Title
**Weeks X–Y · Phase N: Name · ~N hours total**
> 🧭 **Where this fits:** one paragraph orienting the reader   (optional)
## Why this module matters
## Learning objectives
## Week N — Topic          (or "## Part N — Topic" for companion modules)
### Reading (N min) / ### Video / ### Weekend project (N hours)
### 🧪 QA bridge           — ties the concept to the reader's QA background
### 🛡️ Security callout    — the security thread running through every module
## Self-check before moving on   — checkbox list, "without Googling" standard
## Daily 15-min tasks            — Mon–Fri rotation
## ⏭️ Next up
```

The two callout emojis (🧪 QA bridge, 🛡️ security) are load-bearing pedagogy, not decoration — the QA framing is the course's whole differentiator. Keep the voice direct and concrete: real numbers, named tradeoffs, no filler enthusiasm.

**The portal is a single file with no build step.** `index.html` holds the `COURSE` data object (`phases`, `weeks`, `modules`, `code`, `resources`) inline. Adding a module or starter means updating *both* the markdown and the matching `COURSE` entry. Learner progress lives in `localStorage` under `ai-course-progress-v1`; task IDs (`w12-rag`) are the storage keys, so **renaming a task ID silently erases that learner's progress** — don't do it casually. Never hardcode a week count; derive it from `COURSE.weeks.length` (the course is 28 weeks, and hardcoded `24`s have been a recurring bug).

**Cross-references travel in packs.** A new module needs entries in `README.md` (companion table), `ROADMAP.md` (week callout), and `index.html` (`modules` array). A new starter needs a pointer from its module *and* an entry in the `code` array. Check all of them before declaring a change done.

**The provider contract.** Every starter reads the same four variables — `LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`, `LLM_MODEL_SMALL` — and talks to an OpenAI-compatible endpoint through the `openai` SDK. Adding a starter means following that convention, including a copy of `llm.ts` and a `check-provider` script. Module 3 additionally uses `EMBEDDING_*` because embeddings are a separate, less widely served endpoint. The contract is specified in `PROVIDERS.md`; change it there first.

**Secrets.** `.gitignore` blocks `.env*`, keys, and `.dev.vars`. Never write a real key into a file, an example, or a commit — leave placeholder values empty in `.env.example`.

## Facts that expire — read this before writing any claim

This is the single most common way an agent damages this repo: confidently writing a model name, price, or "current best practice" from its own training data, which is by definition older than the reader's situation.

Rules:

1. **Never state a model ID, price, context window, or "the current best X" from memory.** Verify against the vendor's live documentation first, then write it.
2. **Better: don't state it at all.** This repo deliberately contains **no model IDs and no per-token prices**. They live in the learner's `.env`, sourced from their own provider's page. `LLM_MODEL` has no default and fails fast; cost helpers print "unknown" rather than a stale figure. If you are about to add a model name or a dollar amount, you are almost certainly reintroducing the exact rot this design removed — teach the *ratio* or point at the provider's page instead.
3. **Record what you verified** in `VERSIONS.md` — the claim, where it's taught, the date, and a link that can re-check it. Update the "Last full verification" date when you sweep the table.
4. Where a vendor *is* named — as an example, a citation, or a documented compatibility gap — keep it plainly one option among several. Naming Anthropic's compat limitations is useful and specific; making Anthropic the assumed default is the thing this repo moved away from.

## Scope discipline

- **The curriculum is provider-neutral by design.** Everything runs on the OpenAI-compatible Chat Completions API so a learner can complete the course on a free tier, a local Ollama, or a frontier model without editing code. Do not reintroduce a vendor SDK as the default path.
- **Provider-native features are taught as deliberate escape hatches, not defaults.** Prompt caching, reasoning-effort controls and native structured outputs are real and worth using — the course says so — but always framed as "here is what it costs you in portability", behind one function. Keep that framing.
- **Module 16 and the tooling advice are tool-neutral across coding agents.** Same rule: if you add a tool-specific detail, add it as an example, not as the assumed default.
- Don't restructure the week/phase numbering, rename modules, or rewrite voice across files on your own initiative. These ripple through every cross-reference and the portal's stored progress.
- Prefer editing an existing module over adding a new one. The course is already dense; new material should earn its place against a learner's fixed 5–7 hours per week.

## Pull requests

Branch, commit with a descriptive message, open a PR. CI runs the starter typechecks plus a Cloudflare Workers preview deploy. Say what you verified and how — for content changes, say what you checked the facts against.
