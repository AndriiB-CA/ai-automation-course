# Capstone — Playwright Healer 🚀

Starter scaffold for your Week 20–24 capstone project. **Copy this to a new public GitHub repo as the starting point.**

## What you're building

A tool that:
1. **Generates** Playwright specs from a URL (`playwright-healer gen <url>`)
2. **Heals** broken selectors when tests fail (`HealingLocator` wrapper)
3. **Auto-opens PRs** with proposed fixes (GitHub Action)

## Directory layout

```
capstone-playwright-healer/
├── src/
│   ├── index.ts              # CLI entry
│   ├── gen/
│   │   ├── generate.ts       # URL → TestSpec
│   │   └── render.ts         # TestSpec → .spec.ts file
│   ├── heal/
│   │   ├── locator.ts        # HealingLocator wrapper
│   │   └── propose.ts        # LLM: proposes new selector
│   ├── shared/
│   │   ├── llm.ts            # Anthropic client w/ caching
│   │   ├── trace.ts          # Langfuse integration
│   │   └── cost-cap.ts       # Budget enforcement
│   └── schemas.ts            # Zod schemas for LLM outputs
├── tests/
│   ├── generate.spec.ts      # Tests for the generator
│   ├── heal.spec.ts          # Tests for the healer
│   └── fixtures/             # Test pages + DOMs
├── evals/
│   └── heal-quality.yaml     # Promptfoo eval for healer quality
├── .github/
│   └── workflows/
│       ├── test.yml          # Tool's own tests
│       ├── evals.yml         # Heal quality evals
│       └── healer-action.yml # The action that opens heal PRs
├── README.md                 # Your public-facing README
├── CHANGELOG.md
├── SECURITY.md
├── LICENSE
└── package.json
```

## Spec: the CLI

```bash
# Initialize healer config in a Playwright project
npx playwright-healer init

# Generate a test from a URL
npx playwright-healer gen https://example.com/login --out tests/login.spec.ts

# Watch a test run; propose heals on failure
npx playwright-healer watch -- npx playwright test

# Apply a proposed heal (after human review)
npx playwright-healer apply <heal-id>
```

## Spec: the `HealingLocator`

A drop-in for `page.getByRole()` that recovers from DOM changes:

```ts
import { page } from "@playwright/test";
import { heal } from "playwright-healer";

test("login", async () => {
  const login = heal(page, { intent: "Log in button on the login form" });
  await login.click();

  const username = heal(page, { intent: "Email or username input" });
  await username.fill("test@example.com");

  // etc.
});
```

When a locator fails, `heal()`:
1. Captures the DOM + screenshot at failure
2. Sends both + the intent to Claude
3. Gets a proposed selector back (with confidence + rationale)
4. **If confidence ≥ threshold:** retries with new selector, records the heal
5. **Otherwise:** throws as normal; emits a heal-proposal record for human review

## Spec: the GitHub Action

On test run failure with emitted heal-proposals:
1. Applies proposals to the test files
2. Opens a draft PR titled `[healer] Update selectors in login.spec.ts (+2 more)`
3. PR body includes: failure reason, before/after diff, screenshot, confidence, cost
4. Adds `self-healing` label and assigns the original test author

## Setup (when you start Week 20)

```bash
cp -r /path/to/this/starter ~/playwright-healer
cd ~/playwright-healer
git init
npm install
# Start building
```

## Success criteria

See [modules/09-capstone.md](../../modules/09-capstone.md) for the full checklist.

## What makes YOUR version special

Most commercial "self-healing" tools:
- Work only inside a proprietary runner
- Charge per-heal or per-test
- Close-source
- Opaque about what they're doing

Yours:
- Works with stock `@playwright/test`
- Uses standard LLM APIs you control
- Open source
- Every proposal is a reviewable PR — humans stay in the loop
- Documented security model

That's a different product. That's the pitch.
