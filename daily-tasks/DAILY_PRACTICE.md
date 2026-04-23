# 🔁 Daily Practice — 15-Minute Micro-Tasks

> The goal of daily practice is **not** to make huge progress each day. It's to keep the new neural pathways warm so the weekend deep work compounds faster.
> 
> **Rules:**
> - 15 minutes, timer on. When it rings, stop — even mid-sentence.
> - Done beats perfect. A bad attempt is infinitely better than a skipped day.
> - Miss a day? Don't do two tomorrow. Resume normally.

---

## How to use this file

Each weekday has a micro-task drawn from your current module. **Rotate through the 5-task week** for each module you're in:

| Day | Type | Why |
|---|---|---|
| **Mon** | Read | Start the week with input |
| **Tue** | Experiment | REPL, curl, playground |
| **Wed** | Refactor | Polish something you already built |
| **Thu** | Explore | One new tool, blog, or paper |
| **Fri** | Review | Look at what you built this week |

---

## 🟦 Module 1 — LLM API Fundamentals (Weeks 2–4)

**Mon — Read (15 min)**
- Pick one post from [Simon Willison's LLM tag](https://simonwillison.net/tags/llms/). Read it. Don't take notes — just read.

**Tue — Experiment (15 min)**
- Open a Node REPL. Make one API call with `temperature=0`, then `temperature=1.5`. Compare outputs.
- Try `top_p=0.1` vs `top_p=1`. Notice how it narrows.

**Wed — Refactor (15 min)**
- Open your most recent project. Rewrite one prompt to be 20% shorter. Run it. Did quality drop?

**Thu — Explore (15 min)**
- Browse the [Anthropic cookbook](https://github.com/anthropics/anthropic-cookbook). Find one example you haven't seen. Read it.

**Fri — Review (15 min)**
- Diff your current prompts vs the ones you wrote two weeks ago. What changed?

---

## 🟩 Module 2 — Prompt Engineering + Evals (Weeks 5–8)

**Mon — Read**
- One chapter from Anthropic's [Prompt Engineering Interactive Tutorial](https://github.com/anthropics/prompt-eng-interactive-tutorial)

**Tue — Experiment**
- Add one new assertion type to an existing eval suite. Run it.

**Wed — Refactor**
- Take one prompt. Convert plain-text instructions to XML-tagged. Measure output quality on 3 inputs.

**Thu — Explore**
- Browse [Promptfoo's example gallery](https://github.com/promptfoo/promptfoo/tree/main/examples). Pick one pattern you could steal.

**Fri — Review**
- Look at your CI's eval history. What's the pass rate trend? Any regression you missed?

---

## 🟨 Module 3 — RAG (Weeks 9–12)

**Mon — Read**
- One post from [the Weaviate blog](https://weaviate.io/blog) or [Pinecone Learn](https://www.pinecone.io/learn/)

**Tue — Experiment**
- Query your RAG app with a deliberately weird question. Inspect the retrieved chunks. Are they right?

**Wed — Refactor**
- Tighten one chunking parameter. Re-measure Recall@5. Better?

**Thu — Explore**
- Try one technique from [RAG Techniques](https://github.com/NirDiamant/RAG_Techniques) against your dataset

**Fri — Review**
- Open your Langfuse dashboard. Find the longest-latency query this week. Why?

---

## 🟧 Module 4 — Agents & MCP (Weeks 13–16)

**Mon — Read**
- One [Anthropic research post](https://www.anthropic.com/research) or one [MCP blog post](https://modelcontextprotocol.io/blog)

**Tue — Experiment**
- Run your agent with the cheapest model (Haiku). Where does quality break?

**Wed — Refactor**
- Rewrite one tool description to be clearer. Measure tool-call accuracy.

**Thu — Explore**
- Browse [MCP community servers](https://github.com/modelcontextprotocol/servers). Find one you'd actually use.

**Fri — Review**
- Check Langfuse: what's your agent's most common failure mode this week?

---

## 🟪 Module 5 — Browser Agents (Weeks 17–19)

**Mon — Read**
- One post from [Browserbase blog](https://www.browserbase.com/blog) or [Playwright release notes](https://github.com/microsoft/playwright/releases)

**Tue — Experiment**
- Run your browser agent on one new site. Where does it first fail?

**Wed — Refactor**
- Reduce one action's page representation. Cheaper page context → cheaper calls.

**Thu — Explore**
- Skim [Browser-Use's Python source](https://github.com/browser-use/browser-use) for one new idea

**Fri — Review**
- Your agent's latest trace: what was the single most wasted tool call?

---

## 🟥 Module 6 — AI-Powered QA (Weeks 20–21)

**Mon — Read**
- One [Playwright best practices page](https://playwright.dev/docs/best-practices) or flaky-test post

**Tue — Experiment**
- Try your test generator on one new URL. Does the output compile?

**Wed — Refactor**
- Improve one system prompt with a new Playwright best-practice constraint

**Thu — Explore**
- Look at one commercial tool (Testim, Mabl, Applitools). What's their pitch?

**Fri — Review**
- Of the 5 generated tests so far, which one is best? Why?

---

## 🟥 Module 7 — Production (Week 22)

**Mon — Check dashboards**
- Anthropic usage. Langfuse costs. Anything unexpected?

**Tue — Experiment**
- Enable prompt caching on one more prompt. Measure savings over 10 calls.

**Wed — Refactor**
- Swap one Sonnet call to Haiku. Run evals. If pass rate holds, keep it.

**Thu — Explore**
- Read one [Latent Space post](https://www.latent.space/) on LLM ops

**Fri — Review**
- Weekly cost. Is it trending right? What was the biggest driver?

---

## 🛡️ Module 8 — AI Security (Week 23 — and forever after)

**Mon — Read**
- One post from [Embrace the Red](https://embracethered.com/blog/) or [Simon Willison's prompt-injection tag](https://simonwillison.net/tags/prompt-injection/)

**Tue — Experiment**
- Try one jailbreak from [jailbreakchat.com](https://www.jailbreakchat.com/) against your agent

**Wed — Refactor**
- Add one security layer: better input validation, tighter tool allow-list, or output sanitization

**Thu — Explore**
- Read one page from [OWASP LLM Top 10](https://owasp.org/www-project-top-10-for-large-language-model-applications/)

**Fri — Review**
- `npm audit` / `pip-audit` on your projects. Anything critical?

---

## 📓 Weekly reflection prompt

Every Friday evening, spend 5 extra minutes answering:

```
Week: __
Biggest insight:
Most painful bug:
One thing I want to understand better:
Where I felt growth:
Next week's #1 priority:
```

Keep these in a single markdown file. In a year you'll have the best self-journal of your career pivot. Investors, future employers, and your own confidence will thank you.

---

## Rainy day / low-energy menu

Sometimes 15 minutes of code feels like too much. These are the "I only had 10% today" options:

- Open [chat.lmsys.org](https://chat.lmsys.org/), blind-test two models on a prompt you care about. 10 min.
- Read your OWN project README from one month ago. What would you say to that past self?
- Watch one 10-minute talk from [AI Engineer Summit YouTube](https://www.youtube.com/@aiDotEngineer)
- Browse [Hugging Face trending](https://huggingface.co/models?sort=trending). Click two models you haven't heard of.
- Update one line of your resume/LinkedIn to reflect a new skill you have now
