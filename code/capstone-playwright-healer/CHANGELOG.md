# Changelog

All notable changes to **playwright-healer** will be documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Real-time Playwright reporter integration for the `watch` sub-command
- `render.ts` module for richer TestSpec → .spec.ts rendering (multi-step flows, helpers)
- `trace.ts` Langfuse integration for LLM call observability
- `cost-cap.ts` budget enforcement (abort if cumulative spend exceeds a threshold)
- GitHub Action (`healer-action.yml`) that opens draft PRs with heal proposals
- Promptfoo eval suite (`evals/heal-quality.yaml`) for healer quality regression testing
- Screenshot attachment in heal records (referenced in PR bodies)
- `--dry-run` flag for `gen` to preview without writing files

## [0.1.0] - 2026-05-29

### Added
- `HealingLocator` class and `heal()` factory (`src-heal-locator.ts`) — drop-in
  self-healing wrapper for Playwright locators. On failure, captures ARIA
  snapshot + screenshot, asks Claude for a new selector, auto-retries if
  confidence ≥ threshold, and persists a heal record to `.healer/`.
- `index.ts` CLI entry with four sub-commands:
  - `init` — writes `healer.config.json` with sensible defaults
  - `gen <url>` — crawls a URL with headless Chromium, generates a `TestSpec`
    via Claude, and renders a runnable `.spec.ts` file
  - `watch` — wraps any Playwright test invocation; summarises heal proposals
    after a failed run
  - `apply <heal-id>` — reads a recorded proposal, shows a dry-run diff, and
    optionally patches the spec file (requires `--yes`)
- `schemas.ts` — Zod schemas for `TestSpec`, `HealProposal`, and `HealRecord`
- `llm.ts` — pre-configured Anthropic client with prompt-caching opt-in and
  `computeCost()` for per-call USD estimation (Sonnet, Opus, Haiku pricing)
- `package.json` — ESM package with `bin`, `start`, `test`, and `typecheck` scripts
- `tsconfig.json` — strict ESM (ES2022 / NodeNext)
- `.env.example` — documents `ANTHROPIC_API_KEY` and optional configuration
- `CHANGELOG.md` — this file
- `SECURITY.md` — security policy covering spec-file allow-list, DOM
  sanitisation, rate limits, and responsible-disclosure contact

[Unreleased]: https://github.com/YOUR_USERNAME/playwright-healer/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/YOUR_USERNAME/playwright-healer/releases/tag/v0.1.0
