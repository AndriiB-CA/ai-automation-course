/**
 * schemas.ts — Zod schemas for all LLM-produced data structures.
 *
 * Two top-level schemas:
 *   TestSpec    — what the `gen` command asks the LLM to produce
 *   HealProposal — what the `heal` runtime asks the LLM to produce
 *
 * Import these wherever you need runtime validation or TypeScript types.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// TestSpec
// Represents a single generated Playwright test file. The `gen` command asks
// the LLM to fill this out; `render.ts` (to be implemented) converts it into
// a runnable .spec.ts file.
// ---------------------------------------------------------------------------

export const StepSchema = z.object({
  /** Human-readable description of what this step does. */
  description: z.string(),

  /** The Playwright action to perform (e.g. "click", "fill", "expect"). */
  action: z.enum(["navigate", "click", "fill", "select", "expect", "screenshot", "wait"]),

  /** Playwright-compatible locator string, e.g. role=button[name="Login"]. */
  selector: z.string().optional(),

  /** Value used with fill / select actions. */
  value: z.string().optional(),

  /** Expected text/state for expect actions. */
  expected: z.string().optional(),
});
export type Step = z.infer<typeof StepSchema>;

export const TestSpecSchema = z.object({
  /** Title shown in Playwright's reporter, e.g. "Login flow". */
  title: z.string().min(1),

  /** The canonical URL that was crawled to produce this spec. */
  url: z.string().url(),

  /** Ordered list of interactions that make up the test. */
  steps: z.array(StepSchema).min(1),

  /** Additional notes for the human reviewing the generated test. */
  notes: z.string().optional(),
});
export type TestSpec = z.infer<typeof TestSpecSchema>;

// ---------------------------------------------------------------------------
// HealProposal
// Returned by the LLM's `propose_heal` tool call when a locator fails at
// runtime. Matches the inline schema in src-heal-locator.ts but is centralised
// here so other modules (e.g. the `apply` CLI command) can reference it.
// ---------------------------------------------------------------------------

export const HealProposalSchema = z.object({
  /**
   * A Playwright-compatible locator string.
   * Examples: `role=button[name="Submit"]`, `[data-testid="login-btn"]`
   */
  suggestedSelector: z.string().min(1),

  /**
   * Preferred selector type — used for sorting / UI display.
   * role > testid > text > css > xpath (Playwright best-practice order).
   */
  selectorType: z.enum(["role", "testid", "text", "css", "xpath"]),

  /** 0 = wild guess, 1 = certainty. Used to gate auto-apply. */
  confidence: z.number().min(0).max(1),

  /** Explains why this selector matches the original intent. */
  rationale: z.string(),

  /** Path to the spec file that contains the broken selector (optional — filled by the runtime). */
  testFile: z.string().optional(),

  /** The old selector string, for generating the diff in a PR. */
  oldSelector: z.string().optional(),
});
export type HealProposal = z.infer<typeof HealProposalSchema>;

// ---------------------------------------------------------------------------
// HealRecord
// Persisted to .healer/<heal-id>.json by the runtime; read back by `apply`.
// ---------------------------------------------------------------------------

export const HealRecordSchema = z.object({
  /** Stable ID used by `apply <heal-id>`. Matches the filename stem. */
  id: z.string(),

  testFile: z.string().optional(),
  lineNumber: z.number().int().positive().optional(),
  intent: z.string(),
  originalError: z.string(),
  proposal: HealProposalSchema,
  screenshotPath: z.string().optional(),

  /** ISO-8601 timestamp of when the failure was recorded. */
  timestamp: z.string().datetime(),

  /** Estimated USD cost of the LLM call that produced the proposal. */
  cost_usd: z.number().min(0),
});
export type HealRecord = z.infer<typeof HealRecordSchema>;
