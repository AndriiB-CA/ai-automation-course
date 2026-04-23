# Module 0 — Orientation & Mindset

**Week 1 · Phase 1: Foundations · ~5 hours**

---

## Why Week 1 is just reading and setup

Most people quit learning programs in the first three weeks because they hit a technical wall before they've built any momentum. This week we're doing the opposite: removing every possible friction before you touch real code.

By the end of this week you will NOT have built anything flashy. You will have:
- A fully configured development environment
- Working API keys with sensible limits
- A mental model of how LLMs actually work
- A journaling habit started
- The course bookmarked and accessible from your phone

That's the foundation. Starting in Week 2, you code every week without exception.

---

## Monday (30 min) — Read the roadmap

1. Read [README.md](../README.md) all the way through
2. Read [ROADMAP.md](../ROADMAP.md) — don't try to memorize, just know the shape
3. Open [the interactive portal](../index.html) in your browser
4. If you have a phone, also open it there (it works on mobile)

## Wednesday (90 min) — Set up your environment

Walk through [SETUP.md](../SETUP.md) completely. Don't skip the "smoke test" at the end.

When the smoke test prints `It works.` — **check the Week 1 box**. You are ready for Week 2.

## Friday (30 min) — Start the journal

Create a file `journal.md` in your personal (non-public) notebook. First entry:

```markdown
# AI Automation Engineer journey

## Week 1
Date started: __
Why I'm doing this:
What I'm scared of:
What I'm excited about:
Time commitment I'm committing to:

Starting skill baseline:
- LLM APIs: 1/10
- Agent design: 1/10
- RAG: 1/10
- AI security: 1/10
- Browser agents: 1/10  (but I know Playwright: 8/10 😎)
```

You'll come back to this monthly.

## Weekend (2–3 hours) — Build the mental model

Watch, in one sitting:
- 🎥 **[Intro to LLMs — Andrej Karpathy (1h)](https://www.youtube.com/watch?v=zjkBMFhNj_g)** — **mandatory**

Then read:
- **[Building Effective Agents — Anthropic](https://www.anthropic.com/research/building-effective-agents)** — skim for now, re-read around Week 13

Then, relax. The next 23 weeks you'll be building. This weekend you're just absorbing.

---

## The three mental models worth anchoring early

### 1. LLMs are autocomplete on steroids (with a caveat)

At inference time, an LLM generates one token at a time by computing a probability distribution over the vocabulary for the next token, sampling one, then repeating. It doesn't "know" facts — it generates plausible continuations.

**Why it matters**: Temperature, top-p, token limits, structured outputs — all make sense once you understand the LLM is sampling, not reasoning in the classic sense.

### 2. Context is state

LLMs have no memory between API calls. Everything they "know" about your conversation, your user, your data, your tools — must be in the current request. This is the single most important thing to understand about building with LLMs.

**Why it matters**: RAG, tool use, memory patterns, long-context architectures — all are responses to this constraint.

### 3. The model is the product's weakest link

Whatever guarantees you want (no hallucination, always follow the format, never say X, always cite sources) — the model can break them. Probabilistically. Sometimes.

**Why it matters**: This is why evals exist. This is why security is a layered concern. This is why humans stay in the loop. Your job is to engineer *around* non-determinism, not pretend it's absent.

---

## Expectations you should reset

### "Once I understand the math, I'll be able to build"
You don't need to understand attention, backprop, or transformers deeply to be a great AI Automation Engineer. You need to understand *how to use* LLMs well.

### "I need to pick the right framework first"
You need to **build something first**. Framework choice is a late-game concern. Every good framework makes the same raw API easier; pick any when you hit a wall.

### "I should start by fine-tuning a model"
No. 99% of production AI systems never fine-tune. They use frontier models with prompts, RAG, tools, and evals. Fine-tuning is a Week 100+ topic if ever.

### "I'll know I'm good when X"
You'll know you're good when you're the person your team asks to review LLM features in PRs. That takes 6+ months of consistent shipping, not a certificate.

---

## Your Week 1 checklist

- [ ] Read README, ROADMAP
- [ ] Walk through SETUP, smoke test passed
- [ ] Anthropic API key active with spend cap
- [ ] VS Code + extensions installed
- [ ] Journal started (private file, first entry written)
- [ ] Interactive portal bookmarked on phone + desktop
- [ ] Karpathy video watched
- [ ] Joined at least one community from [COMMUNITIES.md](../resources/COMMUNITIES.md)

---

## If you finish early

- Browse one blog post from [Simon Willison](https://simonwillison.net/)
- Play with [chat.lmsys.org](https://chat.lmsys.org/) — blind-test models on prompts you care about
- Look at one [Anthropic cookbook example](https://github.com/anthropics/anthropic-cookbook), read but don't run

**Don't** jump into Week 2 content early. Let it sink in. Momentum comes from rhythm, and the rhythm starts next week.

---

## ⏭️ Next up
**[Module 1 — LLM API Fundamentals](./01-llm-fundamentals.md)** — Weeks 2–4. The raw clay. You start building.
