/**
 * Zod schemas for the TestSpec data model.
 *
 * Step  — a single user interaction or assertion within a test.
 * TestSpec — the full, Claude-generated test specification that is
 *            validated before rendering to .spec.ts source code.
 */

import { z } from "zod";

// ── Step ───────────────────────────────────────────────────────────────────────────────

export const Step = z.object({
  /** Human-readable description of what this step does. */
  description: z.string(),

  /**
   * The Playwright action to perform:
   *   goto    – navigate to a URL
   *   click   – click a locator
   *   fill    – type text into an input
   *   press   – press a keyboard key (e.g. "Enter", "Tab")
   *   expect  – assert something about the page/locator
   */
  action: z.enum(["goto", "click", "fill", "press", "expect"]),

  /**
   * Selector hint from the a11y snapshot.
   * Interpreted by render.ts to pick the best Playwright locator strategy.
   * Examples: "button[Submit]", "textbox[Email]", "heading[Welcome]"
   */
  selector: z.string().optional(),

  /**
   * For fill  → the text to type.
   * For press → the key name (e.g. "Enter").
   * For goto  → the URL to navigate to (overrides the top-level url).
   */
  value: z.string().optional(),

  /** For expect steps: which Playwright web-first assertion to use. */
  assertion: z.enum(["visible", "hidden", "haveText", "haveURL"]).optional(),

  /** For expect steps: the expected string value (text or URL pattern). */
  expected: z.string().optional(),
});

export type Step = z.infer<typeof Step>;

// ── TestSpec ─────────────────────────────────────────────────────────────────────────────────

export const TestSpec = z.object({
  /** The `test('…', async ({ page }) => {})` title. */
  title: z.string(),

  /** The canonical URL under test (used for the initial goto if no goto step). */
  url: z.string().url(),

  /** Ordered list of steps to execute. Between 3 and 15. */
  steps: z.array(Step).min(3).max(15),

  /**
   * Any extra ES import lines to add at the top of the rendered spec.
   * Usually empty — @playwright/test imports are always added automatically.
   */
  imports: z.array(z.string()).default([]),
});

export type TestSpec = z.infer<typeof TestSpec>;
