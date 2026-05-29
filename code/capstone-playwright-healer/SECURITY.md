# Security Policy

## Scope

This document describes the security model of **playwright-healer** — a tool
that uses LLMs to propose and apply changes to Playwright test files. Because
the tool reads live pages and writes source files, several threat surfaces
require explicit policies.

---

## 1. Spec-file allow-list

**The healer may only modify files that match the configured glob patterns.**

Default allow-list (configurable in `healer.config.json`):

```json
"allowedSpecGlobs": ["**/*.spec.ts", "**/*.spec.js"]
```

The `apply` sub-command enforces this at write time: if the recorded
`testFile` path does not match any allowed glob, the command exits with a
non-zero status and no file is written.

**Rationale:** Prevents an LLM-generated proposal — or a maliciously crafted
heal record — from overwriting arbitrary project files (e.g. environment files,
production source, CI configuration).

---

## 2. DOM sanitisation

When the healer captures page state to send to Claude, it:

- Uses the **ARIA accessibility snapshot** (`page.locator("body").ariaSnapshot()`)
  rather than raw HTML. ARIA snapshots contain structural/semantic information
  only — they do not include input values, passwords, tokens, or hidden form
  fields.
- **Never transmits `<input type="password">` values**, authentication headers,
  cookie values, or any data tagged with `aria-hidden="true"`.
- Truncates snapshots to 4 000 characters to limit inadvertent data exfiltration.
- Screenshots are sent as base64 PNGs. Do not run the healer on pages that
  display sensitive information (banking dashboards, admin panels with PII) in
  their visual layout.

**Recommendation:** Run the healer only against test environments, never against
production URLs that handle real user data.

---

## 3. Rate limits and cost controls

The healer calls the Anthropic API on every locator failure. To prevent
runaway spend:

- **Per-call cost** is logged after every LLM response (`computeCost()`).
- Set a budget via the `HEAL_CONFIDENCE_THRESHOLD` environment variable; low-
  confidence proposals are logged but not auto-applied, so an unexpected flood
  of failures does not silently multiply API costs.
- A future `cost-cap.ts` module (see CHANGELOG Unreleased) will abort the
  heal loop once a configurable USD ceiling is reached per test run.
- Prompt caching is enabled by default — repeated identical system prompts
  are served from cache at ~10 % of the normal input-token price.

---

## 4. LLM output validation

Every response from Claude is validated against a Zod schema before use:

- `HealProposalSchema` validates `suggestedSelector`, `confidence`, `selectorType`,
  and `rationale`. A response that fails validation causes the heal to abort
  with an error rather than applying an unvalidated string as a locator.
- `TestSpecSchema` validates generated specs before they are written to disk.

This means the LLM cannot inject arbitrary code through the JSON response
— the selector is treated as a plain string passed to `page.locator()`, not
`eval()`'d.

---

## 5. Responsible disclosure

If you discover a security vulnerability in playwright-healer, please **do not
open a public GitHub issue**. Instead, contact the maintainer directly:

**Email:** [PLACEHOLDER — replace with your address before publishing]

Please include:
- A description of the vulnerability and its potential impact
- Steps to reproduce
- Any suggested mitigations

We aim to acknowledge reports within 48 hours and resolve confirmed
vulnerabilities within 14 days.

---

## Supported versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | Yes       |

Older versions are not supported. Please upgrade to the latest release.
