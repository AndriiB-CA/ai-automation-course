# Module 15 — Interview Prep & System Design

**Career module · after the capstone (Week 24) and bonus phases · your job-hunt launchpad · ~8 hours, then ongoing**

> 🧭 **Where this fits:** You've built the skills and the portfolio. This module converts them into offers. The AI-automation interview loop has standardized into a recognizable shape, and the system-design round is automation-specific — not generic "design Twitter" questions. Prepare deliberately and you'll out-interview stronger engineers who didn't.

---

## Why this module matters

A great portfolio gets you the interview. The interview gets you the job — and it's a learnable, rehearsable skill. Most candidates wing the system-design and take-home rounds and lose to people who prepared for the *specific* shape of these interviews. This module is that preparation.

## Learning objectives

- Know the standard interview loop and what each stage screens for
- Answer automation-specific system-design questions with a repeatable framework
- Treat take-home assessments as production deliverables
- Tell your project stories in quantified, outcome-first terms
- Position your QA-to-AI background as a strength, not a gap

---

## Part 1 — The standard loop

Most companies hiring for AI automation / AI engineering roles run a 4–5 stage process. Know what each stage is actually testing:

1. **Recruiter screen (30 min)** — fit, background, comp expectations. *Screening for:* can you articulate your automation-specific experience clearly and concisely. Have a 60-second story ready.
2. **Technical screen (45–60 min)** — with a hiring manager or senior engineer. Walk through something you built, explaining design decisions and trade-offs. *Screening for:* depth, judgment, can you defend choices.
3. **Take-home or live coding (2–4 hrs, or 24–48 hr take-home)** — the highest-leverage stage. Often: "here's a business process, design and prototype an automation." *Screening for:* solution design, code quality, appropriate use of AI (not over-engineering), error handling, documentation.
4. **System design (60 min)** — design an enterprise automation system. *Screening for:* scalability, reliability, human-in-the-loop design, cost awareness. (Part 2 below.)
5. **Behavioral / culture (45–60 min)** — stakeholder management, handling ambiguity, cross-functional work. *Screening for:* can you operate at the engineering/operations/business boundary.

### Reading (45 min)
- Re-read your own Module 13 — the business-translation skills *are* the system-design and behavioral rounds
- [System design primer (the classic)](https://github.com/donnemartin/system-design-primer) — skim for the vocabulary of scale, not the web-app specifics

---

## Part 2 — System design for automation roles (the framework)

These questions are distinctive. Instead of "design a URL shortener," you'll get:

- "Design an intelligent invoice processing system for a multinational with 50 different invoice formats."
- "Design a multi-agent customer service automation handling 100,000 queries/day at 95% resolution."
- "Design an automated compliance monitoring system that audits transactions against evolving regulations."

Use a **repeatable 6-step framework** (write these on a whiteboard / shared doc as you talk):

1. **Clarify the process & scale.** What's the volume? What are the document/input types? What's the current manual cost and pain? What's the acceptable error rate? (Shows you think business-first — Module 13.)
2. **Map the high-level flow.** Sketch the four-layer stack for this problem: how input arrives (integration), how it's orchestrated, where the AI executes, where output goes. (Module 13's stack.)
3. **Place the intelligence.** Which steps are deterministic (rules/RPA) and which need an LLM agent? Resist using an LLM where a rule suffices — interviewers reward this restraint.
4. **Design for non-determinism.** This is the differentiator vs. classic system design. Apply Constrained Autonomy (Module 12): tool whitelists, output validation, **human-in-the-loop checkpoints at high-risk steps**, audit logging. Explicitly say where the human stays in the loop and why.
5. **Address reliability & scale.** Retries, fallbacks, queues, rate limits, idempotency, monitoring/observability. How do you handle the document that fails? How do you not lose work mid-pipeline?
6. **Optimize cost.** Model tiering, prompt caching, batch processing, response caching. State a rough cost-per-item and how you'd drive it down. (Modules 7 & 12.)

> 🧪 **QA bridge:** Step 4 and step 5 are where your background shines. Most candidates handwave reliability and edge cases. You live there. Lead with "here's how this fails and how I contain it" and you'll stand out.

### Exercise (2 hours)
Take all three example prompts above. For each, spend 30–40 minutes producing a whiteboard-style design using the 6-step framework. Record yourself explaining one out loud in 10 minutes. Listen back — did you lead with the business outcome? Did you place the human in the loop explicitly? Did you mention cost?

---

## Part 3 — The take-home assessment

This is your highest-leverage stage because you control the conditions. Treat the submission as a **production deliverable**, not a hackathon hack:

- **Production structure:** clean repo layout, README, tests, error handling, clear setup steps. (Everything your capstone already demonstrates.)
- **AI used thoughtfully:** LLM where it adds genuine value, deterministic logic where it doesn't. Over-engineering with agents where a regex would do is a red flag to reviewers.
- **Systems thinking:** include monitoring/logging and a paragraph on how you'd maintain and scale it.
- **Quantified impact:** even for a prototype, estimate time saved / accuracy / cost. (Module 13 habit.)
- **A short DECISIONS.md:** document the trade-offs you made and what you'd do with more time. Reviewers love this — it shows judgment.

Your capstone (the Playwright Healer) is effectively a take-home you've already done. Reuse its structure as your template.

---

## Part 4 — Your story (positioning the QA→AI transition)

You're not a junior. You're a senior QA engineer who retooled into AI. Own that framing.

- **The 60-second pitch:** "I spent X years in QA automation with Playwright and TypeScript — flaky systems, CI/CD, regression suites, golden data. I moved into AI engineering because those exact skills — evals, reliability, edge-case thinking — are what production AI systems need. I've shipped [capstone], [RAG app], and [multi-agent system], and I write [blog]." Practice until it's natural.
- **Quantify your stories.** Not "I built a test healer" but "I built an open-source tool that auto-heals Playwright selectors with 78% success on synthetic mutations at $0.04/heal." (Module 13 habit, again — it compounds.)
- **Turn the "gap" into an edge.** When asked "you don't have years of ML experience" — agree and pivot: "Right, I'm not training models. I build *reliable* AI systems, and reliability is exactly the unsolved problem — which is why I lead with evals and constrained autonomy." 
- **Have three stories ready:** a technical-depth story, a stakeholder/ambiguity story, and a failure-and-recovery story.

---

## Part 5 — Logistics & targeting

- **Titles to search:** AI Engineer, Applied AI Engineer, AI Automation Engineer, AI Quality/Test Engineer, Forward Deployed Engineer, AI Product Engineer, LLM Engineer.
- **Where to look:** see [`resources/COMMUNITIES.md`](../resources/COMMUNITIES.md) — the job-board and community list there is your pipeline.
- **Certifications (optional, situational):** a platform cert (e.g., an RPA platform) can help for enterprise automation roles, but a strong public portfolio + blog beats a cert for most AI engineering roles. Don't grind certs in place of shipping.
- **Salary context (US, 2026):** AI automation roles broadly span ~$86K–$204K+ with a median around $135K; the "AI" depth (agents, evals, production systems) is the variable that pushes you toward the top of the band. Know your number before the recruiter screen.

---

## Self-check

- [ ] You can run the 6-step system-design framework on a cold prompt without notes
- [ ] You have three quantified project stories rehearsed
- [ ] You have a natural 60-second QA→AI pitch
- [ ] You can explain Constrained Autonomy in a design round and say where the human stays in the loop
- [ ] Your capstone repo doubles as a take-home template (README, tests, DECISIONS.md)

---

## Daily 15-min tasks (during active job hunt)

- **Mon:** One system-design prompt; 10-minute spoken answer; self-critique
- **Tue:** Refine one project story to be tighter and more quantified
- **Wed:** Read one engineering blog post from a target company; note their stack
- **Thu:** One behavioral question; write a STAR-format answer
- **Fri:** Apply to 3–5 roles; track them; tailor the first line of each application

---

## ⏭️ You're done with the core curriculum
Between the capstone, the RAG app, the multi-agent system, the IDP pipeline, and this interview prep, you have a portfolio and a story most candidates can't match. Go get the role — then keep shipping. See [`resources/NEXT_STEPS.md`](../resources/NEXT_STEPS.md) for what's after the offer.
