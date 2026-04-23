# Module 9 — Capstone: AI-Powered Playwright Healer 🚀

**Week 24 · Phase 3: Ship · ~8 hours total**

> 🎯 **Everything has led here.** 23 weeks of building, and now you ship the one project that demonstrates the whole stack: LLM fluency, tool use, evals, agents, browser automation, production concerns, and security. In public. With your name on it.

---

## The product you're shipping

**Playwright Healer** — an open-source CLI + library that:
1. **Generates** new Playwright specs from a URL or PR diff
2. **Heals** broken selectors when tests fail due to DOM changes
3. **Opens PRs** with the proposed fixes, complete with screenshots and rationale
4. **Tracks** which heals worked in production (closed PR + green CI) to feed future improvements

This is something real engineering teams would use. By itself, it's a portfolio piece that wins interviews. With a real user or a real star count on GitHub, it's a job offer.

---

## Success criteria (be honest with yourself)

The capstone is complete when **every box** below is checked:

### Technical
- [ ] Public GitHub repo with MIT license
- [ ] `README.md` with clear setup instructions, screenshots, and a demo GIF
- [ ] `npx playwright-healer init` initializes a project in any Playwright repo
- [ ] `npx playwright-healer gen <url>` generates a valid spec that runs green
- [ ] `npx playwright-healer watch` monitors test runs and proposes heals on failures
- [ ] GitHub Action that auto-opens PRs on self-heals
- [ ] At least 80% test coverage of the tool's own TypeScript code (meta — Playwright Healer has tests)
- [ ] Eval suite for the healer's heal-suggestion quality (≥70% pass on 20 synthetic mutations)
- [ ] Langfuse integration with traces visible in README screenshot
- [ ] Cost cap enforced; README states expected cost per heal

### Security (non-negotiable)
- [ ] `.env.example` but never a `.env`
- [ ] API keys in GitHub Actions are secrets, not plain text
- [ ] Tool allow-list: healer can only modify `*.spec.ts` / `*.spec.js` files, never CI config or source
- [ ] DOM input to the LLM is sanitized (no form values, no tokens in URLs)
- [ ] Rate limits on auto-heal (max N PRs per day per repo)
- [ ] `RED_TEAM_REPORT.md` in the repo showing you tried to attack your own tool

### Production
- [ ] Published to npm
- [ ] Semantic versioning starting at `0.1.0`
- [ ] CHANGELOG following [Keep a Changelog](https://keepachangelog.com/)
- [ ] CI runs on every PR (the tool's own tests + evals)
- [ ] CODE_OF_CONDUCT, CONTRIBUTING, SECURITY.md files

### Community
- [ ] Published a blog post (dev.to, Medium, your own blog) explaining the architecture
- [ ] LinkedIn post announcing the tool with link
- [ ] Tweet / Bluesky post with the demo GIF
- [ ] Submitted to [Show HN](https://news.ycombinator.com/show) (optional but high-value)

---

## 8-hour capstone sprint plan

Week 24 is dedicated to polish, not new learning. You've built all the parts; this week you assemble and showcase.

### Day 1 (Mon, 1 hr) — Plan the repo
- Sketch final architecture on paper
- Create the public GitHub repo
- Copy over components from Weeks 20, 21
- Decide on the public API (command names, options, defaults)

### Day 2 (Wed, 1 hr) — README polish
- Write the README like it's going on Hacker News (because it might)
- Include: what problem, demo GIF, quickstart, architecture diagram, costs, limitations
- Get an honest friend or LLM to critique it; rewrite

### Day 3 (Fri, 1 hr) — Test coverage + CI
- Make sure your tool's own test suite is green
- Add CI badges to README
- Set branch protection on `main`

### Weekend (4–5 hrs) — The big push
- Record demo GIF (use [Kap](https://getkap.co/) or [Loom](https://www.loom.com/))
- Write blog post — aim for 1,500–2,500 words
- Publish to npm (`npm publish --access public`)
- Write LinkedIn post, Tweet
- Submit to relevant communities (subreddits, Discord servers)
- **Ship it.**

### Sunday evening — Reflect
- Update your resume/LinkedIn: "Built and maintained Playwright Healer, an open-source AI-powered test maintenance tool"
- Write a retrospective: what you learned, what you'd do differently
- Start scoping your next project (v0.2 features, or a new thing entirely)

---

## Architecture reference

```
┌──────────────────────────────────────────────────────────┐
│                    playwright-healer                      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  ┌────────────┐   ┌────────────┐   ┌────────────────┐  │
│  │  gen       │   │  watch     │   │  CI adapter    │  │
│  │  (testgen) │   │  (healer)  │   │  (PR opener)   │  │
│  └─────┬──────┘   └─────┬──────┘   └────────┬───────┘  │
│        │                │                   │          │
│        ▼                ▼                   ▼          │
│  ┌────────────────────────────────────────────────┐   │
│  │           Shared: LLM client + evals           │   │
│  │   • Anthropic SDK with prompt caching          │   │
│  │   • Zod-validated structured outputs           │   │
│  │   • Langfuse traces                            │   │
│  │   • Cost cap + rate limit                      │   │
│  └────────────────────────────────────────────────┘   │
│        │                                                │
│        ▼                                                │
│  ┌────────────────────────────────────────────────┐   │
│  │          Playwright integration layer          │   │
│  │   • Accessibility tree extraction              │   │
│  │   • Screenshot capture                         │   │
│  │   • HealingLocator drop-in wrapper             │   │
│  └────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

Starter code structure in [`/code/capstone-playwright-healer/`](../code/capstone-playwright-healer/).

---

## Blog post template

**Title ideas:**
- "I built an AI agent that heals Playwright tests — here's what I learned"
- "From QA engineer to AI engineer in 24 weeks, with a capstone to prove it"
- "The anatomy of an open-source AI test tool in 2026"

**Structure:**
1. **Hook (1 paragraph)** — the pain you're solving, with a concrete moment
2. **Demo (GIF + 2 paragraphs)** — show, then explain
3. **Architecture (with diagram)** — the stack, why each piece
4. **The interesting bit** — the one genuinely non-obvious engineering decision you made
5. **Results** — metrics: heal success rate, cost per heal, false-positive rate
6. **Limitations** — honesty wins. What it can't do yet.
7. **Roadmap** — what v0.2 looks like
8. **Try it** — install command, link to repo

---

## LinkedIn announcement template

> After 24 weeks transitioning from QA automation to AI Automation Engineering, I just shipped my capstone project:
> 
> 🔗 **[github.com/YOU/playwright-healer]**
> 
> It's an open-source tool that uses Claude to:
> • Generate Playwright tests from URLs
> • Auto-heal broken selectors when the DOM changes
> • Open PRs with proposed fixes
> 
> Every piece reflects something I learned along the way — structured outputs, tool use, evals, MCP, browser agents, prompt caching, and AI security.
> 
> Honest numbers from my test runs: 78% auto-heal success on synthetic mutations, ~$0.04 per heal with prompt caching.
> 
> Open to questions, PRs, and conversations about AI Automation Engineering roles.
> 
> #AIEngineering #Playwright #QualityEngineering #ClaudeAI

---

## What's next after shipping

You've completed a hard 24-week course. Options:

### Dig deeper (2026)
- Contribute to an open-source AI tool (Promptfoo, Mastra, Langfuse all accept PRs)
- Study agent evaluation more deeply — [AgentBench](https://github.com/THUDM/AgentBench), [SWE-bench](https://www.swebench.com/)
- Learn multi-modal AI (vision, audio, video)

### Start interviewing
Your resume now reads:
- Shipped AI automation tool with X users / Y stars
- Built RAG chatbot with documented eval pipeline
- Published 3 technical blog posts on AI engineering topics
- Open-source contributions to [project names]

You're positioned for roles titled:
- **Forward Deployed Engineer** (Anthropic, Scale, Palantir)
- **AI Engineer / Applied AI**
- **AI Test Engineer** / **AI Quality Engineer**
- **Developer Tools Engineer** (AI-flavored)

### Build v2
The tool you shipped will have real users (yourself included). Let their needs drive what you build next. Shipping is not a one-time event — it's a practice.

---

## Final words

You stuck through 24 weeks of learning while working a full job. That's rarer than it sounds. Most people quit at Week 7. You didn't.

The AI field is not a stable target — the exact tools in this course will evolve and some will be replaced. What you've built that will last: **the habits**. Daily practice. Weekend deep work. Evals before merging. Security in the loop. Writing about what you build.

Those habits are the career, not the skills.

Ship the capstone. Announce it. Start the next thing.

---

## ⏭️ After the capstone
[**Where to go next →**](../resources/NEXT_STEPS.md) — curated resources for continuing growth in 2026 and beyond.
