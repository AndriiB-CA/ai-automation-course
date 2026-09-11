# Week 17–18 — Browser Agents (Stagehand + Vision)

Full guidance in [module 5](../../modules/05-browser-agents.md).

## What you'll build

- **Week 17:** A selector-based browser agent using Stagehand
- **Week 18:** A vision-based variant using screenshots + coordinates
- **Week 19:** The production version — Dockerized, observability, retries

## Setup

```bash
npm init -y
npm install @browserbasehq/stagehand openai zod
npm install -D tsx typescript @types/node @playwright/test
npx playwright install chromium
```

## Starter: selector-based agent

Create `stagehand-agent.ts`:

```ts
import { Stagehand } from "@browserbasehq/stagehand";

const stagehand = new Stagehand({
  env: "LOCAL",
  modelName: process.env.LLM_MODEL,
  modelClientOptions: {
    apiKey: process.env.LLM_API_KEY,
    baseURL: process.env.LLM_BASE_URL,   // any OpenAI-compatible provider
  }
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
2. Send to a vision-capable model with task + image
3. The model returns `{ action: "click", x: 400, y: 300 }` or `{ action: "type", text: "..." }`
4. Your code executes via Playwright coordinates
5. Loop

Screenshots travel as an `image_url` part with a `data:image/png;base64,...` URI — that encoding is
the portable one across OpenAI-compatible providers. Check your provider supports vision first; text-only
models return a 400 rather than silently ignoring the image.

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
