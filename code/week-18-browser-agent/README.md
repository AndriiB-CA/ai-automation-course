# Weeks 17–19 — Browser agent

Full guidance in [module 5](../../modules/05-browser-agents.md).

This folder is a runnable loop on the course's provider contract (`LLM_BASE_URL`, `LLM_API_KEY`, `LLM_MODEL`). It is the thing to read. Playwright MCP is the thing to run first, because that is the integration a coding agent already speaks.

## 1. Playwright MCP (do this first)

Add the official server to the MCP client you already use. The config shape is from the [Playwright MCP getting-started page](https://playwright.dev/docs/getting-started-mcp):

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--headless"]
    }
  }
}
```

Recent Playwright builds also expose `npx playwright mcp`. Prefer the getting-started page if the two disagree — it is the page that moves with the package.

Ask the client to do one task on [TodoMVC](https://demo.playwright.dev/todomvc): add three grocery todos and mark the middle one complete. Then come back and run the loop below. You want to see the same job done by a server you did not write, and by a loop you can debug.

Playwright's own planner, generator, and healer are a different feature. They live at [Test agents](https://playwright.dev/docs/test-agents) (`npx playwright init-agents`). Week 20 is where those matter. Don't confuse them with this browser loop.

## 2. The hand-rolled loop

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill LLM_* from PROVIDERS.md
npm run check-provider
npm run agent
```

`src/agent.ts` shows the page to the model as `locator.ariaSnapshot({ boxes: true })` and clicks by role and accessible name. The host allow-list is `ALLOWED_HOSTS`. A failed action comes back as text. The loop does not invent a new selector and click it.

```bash
npm run agent -- "Add a todo named milk and mark it complete"
```

## 3. Vision variant (Week 18)

```bash
npm run vision
```

Same task, screenshot in, coordinates out. Run both and fill the comparison table in the module. If your model is text-only, this command fails with a 400. That is the signal to switch `LLM_MODEL` to one that accepts images, not to delete the image part and pretend it worked.

## Stagehand, pinned aside

Stagehand is a real library and its API has broken across major versions. The old shape (`new Stagehand({ modelName, modelClientOptions })`, `page.act({ action })`) does not match [Stagehand v4](https://docs.stagehand.dev/v4/migrations/v3). If you install it, pin the version you actually read the docs for, and keep it out of this loop. The portable path is the file in `src/`.

## Week 19

Dockerize `src/agent.ts`. The image tag must match the Playwright version in `package.json` — copy the tag from the [Playwright Docker docs](https://playwright.dev/docs/docker), don't reuse an old one from a blog. Run as a non-root user. Keep the host allow-list.
