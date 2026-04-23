# Week 20 — AI-Powered Test Generation

Full guidance in [module 6](../../modules/06-ai-qa.md).

## What you'll build

A CLI: `npx ai-testgen <url>` → emits a valid `*.spec.ts` file that runs green.

## Setup

```bash
npm init -y
npm install @anthropic-ai/sdk zod @playwright/test commander
npm install -D tsx typescript @types/node
npx playwright install chromium
```

## Architecture

```
┌───────────────┐
│ CLI: url + out │
└───────┬────────┘
        ▼
┌───────────────────┐
│ Playwright visits │
│ URL; extracts a11y │
│ snapshot          │
└───────┬───────────┘
        ▼
┌─────────────────────┐
│ Claude Sonnet 4.7   │
│ • cached system prompt (Playwright best practices) │
│ • user: { a11y tree, url, task? } │
│ • tool: emit_spec    │
└───────┬─────────────┘
        ▼
┌────────────────────┐
│ Zod validates TestSpec │
│ → renders to .spec.ts │
│ → tries `npx playwright test` │
│ → self-heal once on failure │
└────────────────────┘
```

## The schema

```ts
import { z } from "zod";

const Step = z.object({
  description: z.string(),
  action: z.enum(["goto", "click", "fill", "press", "expect"]),
  selector: z.string().optional(),
  value: z.string().optional(),
  assertion: z.enum(["visible", "hidden", "haveText", "haveURL"]).optional(),
  expected: z.string().optional(),
});

const TestSpec = z.object({
  title: z.string(),
  url: z.string().url(),
  steps: z.array(Step).min(3).max(15),
  imports: z.array(z.string()).default([]),
});
```

## System prompt skeleton (cache this!)

```
You generate Playwright tests following these best practices:
1. Prefer getByRole() with accessible name
2. Use getByTestId() for instrumented elements
3. Use getByText() only for stable display text
4. Avoid brittle CSS/XPath selectors
5. Use web-first assertions: await expect(locator).toHaveText()
6. NO sleep() calls — use auto-waiting assertions
7. Each test should verify ONE user-facing behavior

Given an accessibility snapshot and a URL, emit a test spec via the emit_spec tool.
```

## Success criteria

- [ ] Generates runnable tests for 5 different public sites
- [ ] Tests pass first-try ≥60%, pass after one self-heal ≥80%
- [ ] Uses prompt caching (measure cost reduction)
- [ ] Cost per test ≤ $0.10

## Files you'll create

- `src/cli.ts` — entry point (commander)
- `src/generate.ts` — LLM call + validation
- `src/render.ts` — TestSpec → .spec.ts string
- `src/verify.ts` — runs the generated test, captures failure
- `src/heal.ts` — one-shot self-heal on failure
- `prompts/system.md` — cached system prompt
