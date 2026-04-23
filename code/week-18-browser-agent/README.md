# Week 17–18 — Browser Agents (Stagehand + Vision)

Full guidance in [module 5](../../modules/05-browser-agents.md).

## What you'll build

- **Week 17:** A selector-based browser agent using Stagehand
- **Week 18:** A vision-based variant using screenshots + coordinates
- **Week 19:** The production version — Dockerized, observability, retries

## Setup

```bash
npm init -y
npm install @browserbasehq/stagehand @anthropic-ai/sdk zod
npm install -D tsx typescript @types/node @playwright/test
npx playwright install chromium
```

## Starter: selector-based agent

Create `stagehand-agent.ts`:

```ts
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  modelName: "claude-sonnet-4-5",
  modelClientOptions: { apiKey: process.env.ANTHROPIC_API_KEY }
});

await stagehand.init();
const page = stagehand.page;

await page.goto("https://demo.playwright.dev/todomvc");
await page.act({ action: "Add three todos about grocery shopping" });
await page.act({ action: "Mark the middle todo as complete" });

const result = await page.extract({
  instruction: "Return the completed todo text",
  schema: z.object({ completedText: z.string() })
});
console.log(result);

await stagehand.close();
```

## Vision-based variant (Week 18)

Replace Stagehand's DOM-based actions with:
1. `page.screenshot()` → full-page image
2. Send to Claude with task + image
3. Claude returns `{ action: "click", x: 400, y: 300 }` or `{ action: "type", text: "..." }`
4. Your code executes via Playwright coordinates
5. Loop

See the [Anthropic Computer Use reference](https://github.com/anthropics/anthropic-quickstarts/tree/main/computer-use-demo) for the vision pattern.

## Evaluation

Run both variants on 5 real tasks. Record:

| Task | Selector success/10 | Vision success/10 | Cost (sel / vis) | Time (sel / vis) |
|------|---------------------|-------------------|------------------|------------------|

Write findings in `COMPARISON.md` — this is great blog-post material.

## 🛡️ Security for browser agents

- Whitelist allowed domains — never navigate to arbitrary URLs from agent input
- Strip hidden elements (`display:none`, `visibility:hidden`) from page-state sent to LLM
- Wrap scraped text in XML tags: `<web_content>...</web_content>` so the LLM knows not to follow instructions from it
- Never put session tokens or API keys in the agent's system prompt
