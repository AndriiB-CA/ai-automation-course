# Week 7 — Evals with Promptfoo

Your **first CI-gated eval pipeline**. By the end of this weekend you'll have:
- A `promptfooconfig.yaml` with ≥15 test cases
- 5+ assertion types
- GitHub Actions workflow that fails PRs on regressions

## Setup

```bash
cd code/week-07-promptfoo-evals
npm install -g promptfoo
export ANTHROPIC_API_KEY=sk-ant-...
```

## Run the eval

```bash
promptfoo eval
promptfoo view   # opens a local web UI to explore results
```

## Files in this starter

| File | Purpose |
|---|---|
| `promptfooconfig.yaml` | The eval config (15 tests, 6 assertion types) |
| `prompts/pr-reviewer.txt` | The system prompt being evaluated |
| `tests/fixtures/` | Sample PR diffs for the eval cases |
| `.github/workflows/evals.yml` | CI integration that gates PRs |
| `ci-regression-check.js` | Post-eval script that compares to baseline |

## After the first run

1. **Inspect the report**: `promptfoo view`
2. **Intentionally break the prompt** (delete an instruction). Re-run. Watch tests fail.
3. **Fix it.** Observe green.
4. **Commit the yaml**. Open a PR. Watch the GitHub Action run.

When CI blocks your own bad PR — take a screenshot. That's portfolio gold.

## Extending to LLM-as-judge

The default assertions (`contains`, `javascript`) are deterministic. For fuzzy quality, use:

```yaml
- type: llm-rubric
  value: |
    The reviewer's response must:
    1. Flag any SQL injection pattern as severity='high' or 'critical'
    2. Provide a specific code fix, not generic advice
    3. Stay under 500 tokens total
  provider: anthropic:messages:claude-opus-4-7
```

This uses a **stronger model to judge a weaker model** — a common eval pattern.
