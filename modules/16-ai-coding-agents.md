# Module 16 — Working with AI Coding Agents

**A meta-skill thread · read in Week 1–2, apply through all 28 weeks · ~4 hours**

> 🧭 **Where this fits:** Every other module teaches you to *build* AI systems. This one teaches you to *build with* them. In 2026 the AI Automation Engineer role assumes you drive agentic coding tools — Claude Code, Cursor, Copilot's agent mode — the way a 2020 engineer was assumed to drive git. Interviewers now ask "walk me through how you work with a coding agent" as routinely as they ask about testing. Read this module before Week 2 and every hour you invest returns compound interest across the remaining 27 weeks — you'll ship the weekend projects faster *and* accumulate real answers to that interview question.

---

## Why this module matters

Two things are simultaneously true in 2026:

1. **Teams that use coding agents well ship dramatically faster** — routine implementation, test scaffolding, migrations, and refactors that took days now take hours.
2. **The measured gains are wildly uneven.** The famous METR study found experienced developers who *felt* ~20% faster with AI tools were actually ~19% *slower* on familiar codebases — because they spent the savings reviewing, correcting, and re-prompting.

The difference between those outcomes isn't the tool. It's the operator's workflow: how they scope tasks, set up the repo, review output, and verify results. That workflow is a learnable skill — and your QA background gives you an unfair advantage at it, because working with a coding agent **is** a review-and-verification discipline. You already have the muscle; this module points it at a new target.

## Learning objectives

- Hold the right mental model: an agent is a fast, tireless pair with no memory and no accountability — you remain the engineer of record
- Set up a repository so agents are productive in it (context files, guardrail tests, deterministic scripts)
- Scope and specify tasks at the size agents complete reliably
- Review AI-written diffs for the failure modes that actually occur — not the ones you'd catch in human code
- Run verification loops so the agent checks its own work before you do
- Apply Constrained Autonomy (Module 12) to your own tooling: permissions, sandboxes, budgets

---

## Part 1 — The mental model

The single most predictive factor in whether someone gets value from a coding agent is the frame they hold. The productive frame:

**The agent is a very fast mid-level engineer who joined your team five minutes ago, has read nothing, forgets everything between sessions, never gets tired, and never pushes back on a bad idea.**

Every clause does work:

- *Very fast* — delegating anything mechanical (boilerplate, test scaffolds, renames across files) is nearly always a win.
- *Joined five minutes ago* — it knows the language and ecosystem cold, but nothing about your conventions, your constraints, or why the code is the way it is. You must supply that context (Part 2).
- *Forgets everything between sessions* — anything you want it to consistently know must live in a file, not in your chat history.
- *Never pushes back* — an agent will cheerfully implement a bad design. "It did what I asked" and "it did the right thing" are different claims. The judgment stays with you.

The corollary: **you are the reviewer and tech lead, not a bystander.** The METR trap is treating agent output as probably-done. Treat it as a PR from a new hire: plausible, fast, and unverified.

### The autonomy slider

Agentic tools run a spectrum, and picking the right point per task is the core operating skill:

| Mode | You do | Use for |
|---|---|---|
| **Autocomplete / inline** | Accept or reject line-by-line | Code you're actively writing and thinking through |
| **Supervised agent** | Approve each file edit and command | Unfamiliar codebases, risky changes, learning a new tool |
| **Auto-accept in a session** | Review the finished diff | Well-scoped tasks with test coverage as the safety net |
| **Background / async agent** | Review the finished PR | Independent, well-specified tasks; migrations; "fix all the lint errors" |

Slide right as trust and test coverage increase; slide left when the blast radius grows. This is the autonomy-boundary decision from Module 13, pointed at your own tooling.

> 🧪 **QA bridge:** You've spent years deciding what can ship on green CI vs. what needs a human. Same decision, smaller loop.

---

## Part 2 — Repo setup: make the agent's first five minutes count

Agents read the repo fresh every session. Repos that are legible to a new hire are legible to an agent — and the same artifacts serve both.

**1. A context file (`CLAUDE.md` / `AGENTS.md`).** The agent reads it automatically at session start. Keep it short and dense — it's a system prompt, not documentation:

```markdown
# Project notes for AI agents
- TypeScript, ESM, strict mode. Zod for all external data validation.
- Run `npm test` after any src/ change; `npx tsc --noEmit` must pass before commit.
- Never commit directly to main. Never touch .env or anything in secrets/.
- Conventions: no default exports; errors are thrown, not returned.
- The eval suite in evals/ is the source of truth for prompt changes — run it, don't reason about it.
```

What belongs: build/test/lint commands, hard constraints ("never X"), conventions the linter doesn't enforce, and pointers to source-of-truth docs. What doesn't: anything the code already says, aspirational style essays, novels. Under a page. The `AGENTS.md` open format ([agents.md](https://agents.md)) is the cross-tool standard; Claude Code reads `CLAUDE.md` natively.

**2. Fast, runnable checks.** An agent that can run `npm test` in 30 seconds self-corrects; one that can't just asserts success. Cheap tests + a typechecker are *agent guardrails* now, not just CI hygiene. This changes the ROI math on test coverage — the suite pays for itself every session.

**3. Deterministic scripts.** `npm run dev`, `npm run test:unit`, `make seed` — one obvious command per common action. Agents (and new hires) fail on tribal-knowledge incantations.

> 🧪 **QA bridge:** "Make the repo testable by a stranger" has been your job forever. The stranger is now silicon and infinitely patient — but the checklist is identical.

### Reading (60 min)

1. [Claude Code best practices (Anthropic engineering)](https://www.anthropic.com/engineering/claude-code-best-practices) — the canonical workflow guide; most of it transfers to any agentic tool
2. [AGENTS.md](https://agents.md) — the open context-file format; skim the examples
3. [Simon Willison on AI-assisted programming](https://simonwillison.net/tags/ai-assisted-programming/) — pick two recent posts; the running commentary of someone who measures

---

## Part 3 — Scoping and specifying tasks

Agents fail in two symmetric ways: tasks too large (they wander, over-build, lose the plot) and specs too vague (they fill the gaps with plausible-but-wrong assumptions). The fixes:

**Right-size the task.** A good agent task is one PR: "add ISO-currency validation to the IDP pipeline and cover it with tests." Not "build the IDP pipeline" (too big — decompose first, or have the agent propose a plan and *review the plan* before any code) and not "fix the bug" (too vague — which bug, observed how, done when?).

**Front-load the spec.** State the goal, the constraints, and the acceptance criteria in the first message. The agent asking you five clarifying questions mid-run costs more than a paragraph of spec up front:

> Add retry with exponential backoff to the extraction call in `src/extract.ts`. Constraints: max 3 attempts, only on 429/5xx, respect the `retry-after` header if present. Done when: unit tests cover all three cases and `npm test` passes. Don't touch the validation layer.

That last sentence — the explicit non-goal — is the highest-leverage line in agent prompting. Agents scope-creep helpfully; fences stop them.

**Plan first on anything non-trivial.** Ask for an implementation plan before code. Reviewing a 10-line plan takes one minute; reviewing 400 lines built on the wrong approach takes an hour and usually ends in a redo.

> 🧪 **QA bridge:** Goal, constraints, acceptance criteria, non-goals — you've written this document a thousand times. It's a test plan. Agent prompting is test-plan writing with a faster feedback loop.

---

## Part 4 — Reviewing AI-written code

AI code review is a different skill from human code review because the failure distribution is different. Human bugs cluster in carelessness (typos, off-by-ones, forgotten cases). Agent bugs cluster in **confident plausibility**:

- **Plausible-but-wrong logic** — code that reads clean, compiles, and handles the happy path while quietly mishandling an edge the spec implied but didn't state. The #1 category.
- **Hallucinated or stale APIs** — a method that doesn't exist, or a pattern from two major versions ago. The typechecker catches the first; only review (or pinned docs in context) catches the second.
- **Over-engineering** — an abstraction layer, a config option, and three helpers where a function would do. Agents pattern-match to "thorough."
- **Silent scope creep** — "while I was in there, I also refactored…" Unrequested changes hide in big diffs; diff size is itself a review signal.
- **Test theater** — tests that mirror the implementation's assumptions (or mock the very thing under test) and assert nothing real. *Read the assertions before you trust the green.*

The review protocol that works:

1. **Read the diff, never skim the summary.** The agent's description of what it did is its intent, not its output.
2. **Check the edges first** — empty input, error paths, boundaries. That's where plausible-but-wrong lives.
3. **Run the tests and read what they assert.** Green means nothing until you've seen the assertions.
4. **Challenge additions you didn't ask for.** Make the agent justify or remove them.
5. **Reject early and re-scope** — if the approach is wrong, don't line-edit 400 lines. Kill it, tighten the spec, rerun. Regenerating is cheap; polishing a wrong approach isn't.

> 🧪 **QA bridge:** This is exploratory testing applied to a diff — hunting for what the author *didn't consider* rather than what they typed wrong. Nobody is better positioned for this than you, and in interviews it's exactly the story that differentiates "I use AI" from "I supervise AI."

---

## Part 5 — Verification loops: make the agent check its own work

The most powerful agentic-workflow upgrade is closing the loop — giving the agent a way to *observe* whether its change worked, instead of reasoning that it should have:

- **Tests in the loop.** "Run the tests after every change; don't report done until they pass." With a guardrail suite (Part 2), the agent catches its own regressions before you see them.
- **TDD inverted.** Have the agent write the failing test first, get your sign-off on *the test*, then implement until green. You review the contract, not the plumbing — reviewing a test is faster than reviewing an implementation, and it pins the spec.
- **Let it see runtime reality.** Logs, script output, a curl against the dev server, a screenshot for UI work. An agent that can observe reality stops hallucinating success.
- **Measure your own workflow.** Track roughly, per delegated task: did it complete without redo? How long was review? A month of notes tells you which task types to delegate and which to keep — *your* trajectory eval (Week 27) pointed at your own tooling, and your defense against the METR trap of feeling fast while being slow.

---

## Part 6 — Guardrails: Constrained Autonomy for your own tools 🛡️

A coding agent is an agent with `bash` and write access to your filesystem. Module 12's four pillars apply verbatim:

- **Tool whitelists** — run with permission prompts on by default; auto-allow read-only operations; keep approval on `git push`, package installs, and anything that touches prod or spends money. Full-auto "YOLO mode" belongs only in a sandbox/container or a disposable worktree.
- **Output validation** — the guardrail test suite + typechecker + your review. Never merge unread AI code, no matter how green.
- **HITL checkpoints** — plan approval before code (Part 3), your review before merge. Non-negotiable: **the accountability stays with the human whose name is on the commit.**
- **Audit trail** — small commits on a branch as the agent works, never direct-to-main. A bad run should be one `git reset` away from gone; git hygiene is your undo button.

Two threats specific to agentic coding: **secrets** (the agent reads files to build context — keep credentials out of the repo and in env vars/managed stores, and deny-list secret paths in your tool's config) and **prompt injection via dependencies** (a malicious README or package description becomes instructions when the agent reads it — Module 8's tool-result injection, in your terminal). Treat what the agent *reads* as untrusted input, because it is.

---

## The 2026 landscape (one paragraph, deliberately)

Interactive terminal/IDE agents (Claude Code, Cursor, Windsurf, Copilot agent mode), async background agents that take an issue and return a PR (Codex-style, Claude Code on the web, Copilot coding agent), and CI-resident agents that review PRs or fix failing builds. The workflow in this module transfers across all three — context files, scoped specs, verification loops, and review discipline are tool-agnostic. Don't over-index on any one product; the tools are converging fast, and the operator skill is the durable asset.

---

## Weekend project (3–4 hours)

**Delegate one real course task to a coding agent, end to end, and measure it.**

Pick a genuine task from your current week — extending one of the code starters is ideal (e.g., add the Batch API stretch goal to `code/module-14-idp/`, or the memory directory to `code/module-12-multi-agent/`).

Requirements (the rubric):
- [ ] Write a `CLAUDE.md` / `AGENTS.md` for the starter repo *first* (Part 2 checklist: commands, constraints, conventions)
- [ ] Write the task spec before opening the tool: goal, constraints, acceptance criteria, explicit non-goals
- [ ] Ask for a plan first; approve or correct it before any code is written
- [ ] Agent runs the tests itself and iterates to green before presenting
- [ ] Review the final diff with the Part 4 protocol; log every issue you catch, by failure-mode category
- [ ] Work happens on a branch with incremental commits — never direct-to-main
- [ ] Write a ~10-line retro: where the agent saved time, where it cost time, what you'd scope differently

### Stretch
- Run the *same* task twice — once with your `CLAUDE.md` and spec, once with a bare one-line prompt in a fresh clone. Diff the results and the review time. This is an A/B eval of your own context engineering, and it will make the value of Part 2 visceral.
- Turn your Part 4 checklist into a custom slash command or reusable review prompt in your tool of choice.

---

## Self-check before moving on

- [ ] You can state the mental model and what each clause implies for your workflow
- [ ] Your course-project repos have a context file and a guardrail test command an agent can run
- [ ] You can name the five AI-code failure modes from memory and where each hides
- [ ] You ask for plans before code on non-trivial tasks, and you've rejected at least one plan
- [ ] Your agent sessions run on branches with permission prompts calibrated to blast radius
- [ ] You can answer "how do you work with AI coding tools?" with process and measurements, not vibes

---

## Daily 15-min tasks

- **Mon:** Delegate one small real task (a test, a rename, a docstring pass). Review with the Part 4 protocol.
- **Tue:** Improve one repo's `CLAUDE.md` based on something the agent got wrong yesterday.
- **Wed:** Read one section of the Claude Code best-practices post; adopt or reject one technique deliberately.
- **Thu:** Find one issue in an AI diff *before* running the tests. Note which failure mode it was.
- **Fri:** Update your delegation log: what did you hand off this week, and what was the redo rate?

---

## ⏭️ Next up

This thread runs alongside everything. It pays off immediately in every weekend project, feeds **Module 12** (you're now the human in your own constrained-autonomy loop), gives **Week 27's** trajectory-eval mindset a daily testbed, and hands **Module 15** a ready-made interview answer. Revisit your delegation log before the job hunt — it's evidence.
