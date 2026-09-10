# 🤖 QA → AI Automation Engineer

> A 24-week core + bonus roadmap from Playwright/TypeScript QA engineer to **AI Automation Engineer**. You'll build production AI systems — RAG, agents, browser automation, document pipelines — with the evals-and-reliability discipline a QA background gives you. Capstone: ship an **AI-powered Playwright test generator & self-healer** to your portfolio.

[![Made for QA](https://img.shields.io/badge/Made_for-QA_Engineers-blue)]()
[![Stack](https://img.shields.io/badge/Stack-TypeScript_%2B_Python-orange)]()
[![Duration](https://img.shields.io/badge/Duration-24_weeks_%2B_bonus-green)]()
[![Pace](https://img.shields.io/badge/Pace-5--7_hrs%2Fweek-yellow)]()

---

## What this course is (and isn't)

This is an **AI engineering course with a strong automation and QA emphasis.** You'll learn to build, evaluate, secure, and ship LLM-powered systems — and to wire them into real business workflows so a whole team can use them.

The market uses "AI Automation Engineer" to mean someone who **automates business processes by combining orchestration with LLM agents** — the documented shift from scripted RPA bots to agentic AI systems that reason, plan, and self-correct. This course gets you there from the engineering side: you'll go deep on the AI execution layer (agents, RAG, evals), build the orchestration and integration layer (n8n, multi-agent systems, document pipelines), and learn the business-translation skills that separate this role from pure engineering.

It positions you for roles titled **AI Engineer, AI Automation Engineer, AI Quality/Test Engineer, Applied AI Engineer, and Forward Deployed Engineer.** If your goal is enterprise RPA specifically (UiPath/Automation Anywhere shops), pair this with a platform certification — the AI half is here; the platform-specific half you'd add on top.

---

## Why this course exists

Most "become an AI Engineer" roadmaps assume you're starting from zero. You're not. You already understand:

- ✅ Flaky tests, non-deterministic systems, retries
- ✅ Selectors, DOM traversal, browser automation
- ✅ Assertions, golden data, regression suites
- ✅ CI/CD, PR reviews, reproducible environments

Those are **exactly** the skills that transfer to LLM evals, agent reliability, and production AI systems. This course treats you like what you are: a senior who needs to retool, not a beginner who needs to relearn software.

---

## 🎯 What you'll be able to do

By the end of this roadmap you will have:

1. **Built a RAG chatbot** over a real dataset with retrieval quality evals
2. **Shipped an MCP-powered agent** that uses tools to complete multi-step tasks
3. **Architected a multi-agent system** (manager/worker) with constrained-autonomy guardrails
4. **Built an intelligent document-processing pipeline** — the #1 enterprise automation use case
5. **Wired Playwright to an LLM** to build a browser agent that fills forms, scrapes data, and recovers from UI changes
6. **Published your capstone**: an AI-powered Playwright test maintenance tool on GitHub
7. **Orchestrated business workflows in n8n** so non-engineers can trigger your AI tools
8. **Red-teamed your own agents** against the OWASP LLM (and Agentic) Top 10
9. **Modeled the business case** for an automation and learned to pitch it
10. **Prepared for the interview loop** — automation-specific system design and your QA→AI story
11. **Written 3 technical blog posts** documenting your builds (portfolio gold)

---

## 📅 The roadmap at a glance

| Part | Weeks | Topic | Why it's here |
|------|-------|-------|---------------|
| 0 | 1 | **Orientation & Setup** | Environment, API keys, mental models |
| 1 | 2–4 | **LLM API Fundamentals** | The raw clay. Structured outputs. Tool use. |
| 2 | 5–8 | **Prompt Engineering + Evals** | QA brain goes brrr. This is your edge. |
| 3 | 9–12 | **RAG Systems** | The #1 production AI pattern in 2026 |
| 4 | 13–16 | **Agents & MCP** | Multi-step reasoning + tool use at scale |
| 5 | 17–19 | **Browser Agents** | Your Playwright skills become superpowers |
| 6 | 20–21 | **AI-Powered QA** | Test generation + self-healing (your track) |
| 7 | 22 | **Production & Observability** | Tracing, cost, caching, versioning |
| 8 | 23 | **AI Security** | Prompt injection, OWASP LLM Top 10 |
| 9 | 24 | **Capstone Ship** | Public release + writeup |
| Bonus | 25–26 | **n8n Automation** | Wire your AI pipelines to Slack/Jira/CI — the no-code glue layer |
| Bonus | 27–28 | **Evaluating Agents** | Trajectory + safety evals — the production gap almost nobody fills |

### 📎 Companion & career modules (woven into the journey, not extra weeks)

These close the gap between "AI engineer" and "AI **automation** engineer." Read them at the points noted:

| Module | Read it… | Why |
|--------|----------|-----|
| **[Multi-Agent Orchestration](./modules/12-multi-agent-orchestration.md)** | during/after Week 15 | Manager/worker systems, **Constrained Autonomy**, the framework landscape, agent cost control — the biggest 2026 skill upgrade |
| **[Business Translation](./modules/13-business-translation.md)** | skim in Phase 1, apply throughout, deep-read before capstone | Process mapping, ROI modeling, stakeholder comms — the #1 thing that separates this role from pure engineering |
| **[Intelligent Document Processing](./modules/14-document-processing.md)** | as a project around Weeks 11–12 | The largest real-world automation use case; builds on your structured-outputs + RAG skills |
| **[Interview Prep & System Design](./modules/15-interview-prep.md)** | after Week 24 | Automation-specific system design + your QA→AI story = offers |
| **[Working with AI Coding Agents](./modules/16-ai-coding-agents.md)** | in Week 1–2, apply throughout | The meta-skill: repo setup, task scoping, reviewing AI diffs, verification loops — compounds across all 28 weeks |

👉 Full breakdown: [**ROADMAP.md**](./ROADMAP.md)

---

## 🚀 How to use this course

### Option 1: Interactive portal (recommended)
Open `index.html` in your browser — works on desktop and mobile. Tracks your progress, lets you tick off lessons, and keeps daily tasks front-and-center.

👉 You can also host this for free via **GitHub Pages** (see [SETUP.md](./SETUP.md#deploy-to-github-pages)) to access it from any device with one URL.

### Option 2: Read straight on GitHub
Every module is a markdown file under [`/modules`](./modules). GitHub's renderer handles code, images, and navigation on mobile automatically.

### Option 3: Clone and make it yours
```bash
git clone <your-fork-url>
cd ai-automation-course
# edit anything, add notes, fork your own version
```

---

## 📆 Your weekly rhythm (5–7 hrs)

Designed for a working engineer with a job and a life:

- **Mon/Wed/Fri (30 min each)** → Daily micro-task from [`daily-tasks/`](./daily-tasks/DAILY_PRACTICE.md). Read docs, experiment in a REPL, review prior week.
- **Tue/Thu — OFF** or reading on commute (no typing required)
- **One weekend session (3–4 hrs)** → The week's main project. This is where the real learning happens.

Total: ~5–7 hrs. Sustainable indefinitely.

---

## 🧭 Navigation

| What you need | Where to go |
|---|---|
| Set up your environment | [SETUP.md](./SETUP.md) |
| Pick an LLM provider (or swap later) | [PROVIDERS.md](./PROVIDERS.md) — base URLs, free tiers, compatibility gaps |
| Week-by-week plan | [ROADMAP.md](./ROADMAP.md) |
| Current module content | [`/modules`](./modules) |
| Working code examples | [`/code`](./code) |
| Daily 15-min practice | [`/daily-tasks`](./daily-tasks/DAILY_PRACTICE.md) |
| Curated video library | [`/resources/VIDEOS.md`](./resources/VIDEOS.md) |
| Tools cheat sheet | [`/resources/TOOLS.md`](./resources/TOOLS.md) |
| Communities to join | [`/resources/COMMUNITIES.md`](./resources/COMMUNITIES.md) |
| Is this content still current? | [VERSIONS.md](./VERSIONS.md) — freshness ledger, re-verified quarterly |
| Working on this repo with an AI agent | [AGENTS.md](./AGENTS.md) — conventions any coding agent should read first |

---

## 🛡️ Cybersecurity thread

AI security isn't a bolt-on at the end — it runs through every module as a 🛡️ callout, and **Constrained Autonomy** (Module 12) is the production pattern that ties it together. The full deep dive is [Module 8](./modules/08-security.md), the agentic-era evals are in [Module 11](./modules/11-agent-evals.md) and Week 28, but expect red-team exercises starting Week 2.

---

## ✅ Progress checklist

Track this in the interactive portal, or just tick boxes here:

- [ ] Week 1: Environment set up, first API call working
- [ ] Week 4: Tool-use agent that queries a real API
- [ ] Week 8: Eval suite with ≥15 test cases + CI pipeline
- [ ] Week 12: RAG chatbot deployed (even if just Vercel preview)
- [ ] Week 15+: Multi-agent system with constrained-autonomy guardrails (Module 12)
- [ ] Week 16: Multi-tool MCP agent on GitHub
- [ ] Week 19: Browser agent that completes a 5-step task end-to-end
- [ ] Week 21: AI-generated Playwright test suite
- [ ] Week 23: Your agent survives a red-team session
- [ ] Week 24: **Capstone shipped**, blog post published, LinkedIn updated
- [ ] Bonus: n8n workflow live; agent trajectory + safety evals in CI
- [ ] Career: ROI model + executive brief written (Module 13); interview loop rehearsed (Module 15)

---

## 📜 License

MIT for course content. Third-party resources (videos, articles) belong to their creators — always follow the original licenses.

---

*Built specifically for the QA → AI transition. If you find gaps, open a PR.*
