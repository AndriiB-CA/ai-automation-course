# Module 6 — AI-Powered QA 🎯

**Weeks 20–21 · Phase 3: Ship · ~12 hours total**

> 🎯 **Your chosen track.** Every skill from Modules 1–5 comes together here. This directly feeds your capstone in Week 24.

---

## Why this module matters

QA is being rewired in 2026. Developers using AI coding agents — Claude Code, Cursor, Copilot, Codex, and the rest — can write tests faster than ever. The QA role is moving upstream: strategy, architecture, **tools that make other engineers' tests better**. This module teaches you to build those tools.

## Learning objectives

- Build an AI test generator that produces valid Playwright specs from URLs or PR diffs
- Build a self-healing `Locator` wrapper that recovers from DOM changes
- Understand where AI helps vs hurts in QA
- Have a fully working prototype of your capstone

---

## Week 20 — AI-Powered Test Generation ⭐

### The north star
A CLI command:
```bash
npx ai-testgen https://example.com/login
```

Outputs a valid `login.spec.ts` that:
- Uses `@playwright/test` syntax correctly
- Has proper awaits and Playwright-recommended selectors (role > test-id > text > css)
- Covers happy path + 2–3 edge cases
- Has meaningful assertions, not just `expect(page).toHaveURL()`
- Runs green against the site on first try

### Reading (90 min)
- Your AI coding agent's docs — whichever you settled on in Module 16
- [Playwright — Best Practices](https://playwright.dev/docs/best-practices)
- Revisit your own Week 2 summarizer — you already know structured streaming
- Prompt caching in your provider's docs — critical for cost, and **provider-native**: it is one of the few features an OpenAI-compatible layer generally does not carry through (see [PROVIDERS.md](../PROVIDERS.md))

### Architecture sketch
```
┌──────────────────────┐
│  ai-testgen CLI      │
└──────────┬───────────┘
           │ URL
           ▼
┌──────────────────────┐
│  Playwright: load &  │
│  extract a11y tree   │
└──────────┬───────────┘
           │ structured page state
           ▼
┌──────────────────────┐
│  LLM ($LLM_MODEL)    │
│  system: testgen     │
│  user: {page, task}  │
│  tool: emit_test     │
└──────────┬───────────┘
           │ TestSpec schema
           ▼
┌──────────────────────┐
│  Validate: TS parse  │
│  Run: npx playwright │
│  Self-heal: retry w/ │
│  failure trace       │
└──────────┬───────────┘
           │ final .spec.ts
           ▼
   Write to filesystem
```

### Weekend project (4 hours)

Build the tool. See starter in [`/code/week-20-ai-test-generator/`](../code/week-20-ai-test-generator/).

**Required features:**
- [ ] Takes a URL
- [ ] Captures page state with `locator.ariaSnapshot({ boxes: true })` (or `page.ariaSnapshot()`). `page.accessibility` was removed in Playwright 1.57. The `boxes` option appends `[box=x,y,width,height]`, which is the snapshot you want when a later step needs coordinates.
- [ ] Calls the model with a carefully crafted system prompt
- [ ] Uses structured output (Zod-validated TestSpec)
- [ ] Emits valid TypeScript to disk
- [ ] Runs the generated test against the page
- [ ] On failure, sends the test + error back to the model for one retry
- [ ] Prints cost at the end

**Prompt caching tip:** Put your Playwright best-practices guide + system prompt in a cached prefix. You'll save 90% on repeated calls.

### Quality benchmarks to hit
Generate tests for 5 public sites:
- [playwright.dev](https://playwright.dev)
- [github.com/login](https://github.com/login)
- [news.ycombinator.com](https://news.ycombinator.com)
- [demo.playwright.dev/todomvc](https://demo.playwright.dev/todomvc)
- Your own production site (or a landing page)

For each, record:
- Did the test run green first try?
- Did it pass after one self-heal iteration?
- Was the coverage meaningful (not just "page loads")?
- Cost per test?

### 🧪 QA veteran reality check
AI-generated tests have a failure mode: **they test the app is what it is, not what it should be.** If the login form is broken, the generated test will codify the broken behavior. Always have a human review. Document this failure mode in your README. Honest self-critique is a differentiator.

---

## Week 21 — Self-Healing Selectors ⭐

### The problem AI actually solves
Flaky selectors aren't a test bug. They're a **consequence of the DOM changing faster than tests do**. The developer ships a component refactor, a `data-testid` moves from a `<div>` to a `<span>`, your test breaks, your CI goes red, you waste 20 minutes.

What if:
- Test fails due to selector error
- System captures the current DOM + the test intent
- LLM proposes a fix
- PR auto-opens with the patch
- You review and merge if correct

That's your self-healer.

### Reading (90 min)
- [Playwright Test Agents — healer](https://playwright.dev/docs/test-agents) — what Playwright already ships. Your project is the part it does not: a mutation eval, a human-reviewed PR, and an explicit split between locator drift and a real product bug
- [Testim AI — self-healing tests explainer](https://www.testim.ai/blog/ai-based-automated-testing/) — competitor research
- [Octokit.js — programmatic GitHub PRs](https://github.com/octokit/octokit.js)

### Architecture sketch
```ts
// The healer proposes a patch. It does not click the new selector.
// A live retry turns a product bug into a green test.
class HealingLocator {
  constructor(private page: Page, private intent: string) {}

  async click() {
    try {
      await this.page.getByRole("button", { name: this.intent }).click();
    } catch (err) {
      const aria = await this.page.locator("body").ariaSnapshot({ boxes: true });
      const fix = await llmProposeFix({ intent: this.intent, aria, error: err });
      // fix.verdict is locator-drift | product-bug | unknown
      await recordForPullRequest(fix); // human applies it, or rejects it
      throw err;
    }
  }
}
```

### Weekend project (4 hours)

**Build:** A self-healing `Locator` wrapper + a CI integration.

**Part 1 (2 hrs):** The wrapper
- Accepts a semantic intent (`"submit button on the login form"`)
- First tries role-based selectors derived from the intent
- On failure, extracts the DOM + error, asks the model for a new selector with a rubric
- Returns the new selector
- Emits a JSON diff record: `{ testFile, oldSelector, newSelector, confidence, rationale }`

**Part 2 (2 hrs):** The CI integration
- After a test suite run, collect all diff records
- For each: use Octokit to open a PR that applies the patch
- Include before/after screenshots in the PR body
- Tag with `self-healing` label

See starter code in [`/code/capstone-playwright-healer/`](../code/capstone-playwright-healer/) — you'll keep building on this for the capstone.

### Evaluation: the mutation table
Before shipping, **prove it** on mutations you can explain. Take 20 working tests. Mutate each one. Include both kinds:

- **Locator drift** — rename an id, move a class, swap a tag. The behavior is still there. A correct heal proposes a new locator.
- **Product bug** — remove the control, or change what the click does. A correct heal says the product broke and does **not** propose a selector that makes the test pass.

Fill this table. Empty cells are the assignment. A lower measured rate you can defend beats a round number you did not measure.

| # | Mutation | Expected verdict | Healer verdict | Correct fix? | Would the patch have hidden a real bug? |
|---|---|---|---|---|---|
| 1 | | locator-drift or product-bug | | yes/no | yes/no |

The starter records `verdict` and does not click the suggestion. That is the behavior this table is about.

### 🛡️ Security callout
Your healer reads DOMs, including potentially sensitive pages. Rules:
- Redact form inputs before sending them to the provider (values, not structure)
- Redact URLs with tokens (`?token=...`)
- Never log PII in your diff records
- PRs go to a private repo or draft by default

### 🧪 QA bridge — your product pitch
You have just built something real QA teams at every company struggle with. Companies pay five-figure sums to Testim, Functionize, and Applitools for fragments of this. **You are building your capstone right now.**

---

## Self-check before moving on

- [ ] You have a working test generator that produces valid tests for ≥3 sites
- [ ] You have a self-healing locator that records a proposal and does not click it
- [ ] The mutation table has 20 rows, including at least one product-bug row the healer did not "fix"
- [ ] You can explain the failure modes of both tools to another engineer
- [ ] You have cost data for `LLM_MODEL` vs `LLM_MODEL_SMALL`, with and without prompt caching on a provider that supports it

---

## Daily 15-min tasks

- **Mon:** Take one failing test from your job or a past project. Can your healer fix it? Why or why not?
- **Tue:** Read one [Cypress / Playwright blog post on flaky tests](https://playwright.dev/docs/test-retries) — bring QA craft into your AI tool
- **Wed:** Refine your testgen system prompt by 10% (shorter, clearer)
- **Thu:** Look at [testrigor](https://testrigor.com/) or [Mabl](https://www.mabl.com/) — what do they do you don't? What don't they do that you could?
- **Fri:** Write 3 sentences about what's different about YOUR tool vs the incumbents. This is your capstone pitch.

---

## ⏭️ Next up
**[Module 7 — Production](./07-production.md)** — Week 22. Make your capstone cheap, fast, and observable before shipping.
