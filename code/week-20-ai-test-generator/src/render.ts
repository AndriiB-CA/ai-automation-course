/**
 * render.ts
 *
 * Pure function: TestSpec → a valid @playwright/test `.spec.ts` source string.
 *
 * Selector heuristics (in priority order, matching the system prompt):
 *   role[<name>]      → page.getByRole('<role>', { name: '<name>' })
 *   testid[<id>]      → page.getByTestId('<id>')
 *   label[<text>]     → page.getByLabel('<text>')
 *   placeholder[<t>]  → page.getByPlaceholder('<t>')
 *   text[<content>]   → page.getByText('<content>')
 *   alt[<text>]       → page.getByAltText('<text>')
 *   <anything else>   → page.locator('<selector>')  (fallback)
 *
 * The selector hint format that Claude uses is "<type>[<value>]".
 * For role selectors the accessible name is included in the value,
 * e.g. "button[Submit]" → getByRole('button', { name: 'Submit' }).
 */

import type { TestSpec, Step } from "./schemas.js";

// ── Selector parsing ──────────────────────────────────────────────

/** Known ARIA roles — used to distinguish role[…] hints from other types. */
const ARIA_ROLES = new Set([
  "alert", "alertdialog", "application", "article", "banner", "button",
  "cell", "checkbox", "columnheader", "combobox", "complementary",
  "contentinfo", "definition", "dialog", "directory", "document",
  "feed", "figure", "form", "generic", "grid", "gridcell", "group",
  "heading", "img", "link", "list", "listbox", "listitem", "log",
  "main", "marquee", "math", "menu", "menubar", "menuitem",
  "menuitemcheckbox", "menuitemradio", "navigation", "none",
  "note", "option", "presentation", "progressbar", "radio",
  "radiogroup", "region", "row", "rowgroup", "rowheader", "scrollbar",
  "search", "searchbox", "separator", "slider", "spinbutton", "status",
  "switch", "tab", "table", "tablist", "tabpanel", "term", "textbox",
  "timer", "toolbar", "tooltip", "tree", "treegrid", "treeitem",
]);

interface ParsedSelector {
  type: "role" | "testid" | "label" | "placeholder" | "text" | "alt" | "raw";
  role?: string;     // only for type === "role"
  value: string;     // the name / id / text / raw selector
}

/**
 * Parse a selector hint string like "button[Submit]" into a structured form.
 * Falls back to { type: "raw", value: selector } for unrecognised patterns.
 */
function parseSelector(selector: string): ParsedSelector {
  // Match "<prefix>[<value>]"
  const match = selector.match(/^([^\[]+)\[(.+)\]$/s);
  if (!match) {
    return { type: "raw", value: selector };
  }

  const prefix = match[1].trim().toLowerCase();
  const value = match[2].trim();

  if (prefix === "testid") return { type: "testid", value };
  if (prefix === "label") return { type: "label", value };
  if (prefix === "placeholder") return { type: "placeholder", value };
  if (prefix === "text") return { type: "text", value };
  if (prefix === "alt") return { type: "alt", value };

  // If the prefix is a known ARIA role, treat as role[Name]
  if (ARIA_ROLES.has(prefix)) {
    return { type: "role", role: prefix, value };
  }

  // Unrecognised — fall back to raw locator
  return { type: "raw", value: selector };
}

/** Render a parsed selector to the appropriate Playwright locator call. */
function renderLocator(parsed: ParsedSelector): string {
  switch (parsed.type) {
    case "role":
      return `page.getByRole('${parsed.role}', { name: '${esc(parsed.value)}' })`;
    case "testid":
      return `page.getByTestId('${esc(parsed.value)}')`;
    case "label":
      return `page.getByLabel('${esc(parsed.value)}')`;
    case "placeholder":
      return `page.getByPlaceholder('${esc(parsed.value)}')`;
    case "text":
      return `page.getByText('${esc(parsed.value)}')`;
    case "alt":
      return `page.getByAltText('${esc(parsed.value)}')`;
    case "raw":
    default:
      return `page.locator('${esc(parsed.value)}')`;
  }
}

// ── Step rendering ────────────────────────────────────────────────

/** Escape single quotes inside a string that will be placed in single-quoted JS. */
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/**
 * Render a single Step to one or more lines of Playwright TypeScript code.
 * Returns the line(s) with a leading comment from step.description.
 */
function renderStep(step: Step, spec: TestSpec): string[] {
  const lines: string[] = [];
  // Add the description as a comment so the spec is self-documenting
  lines.push(`    // ${step.description}`);

  switch (step.action) {
    case "goto": {
      const url = step.value ?? spec.url;
      lines.push(`    await page.goto('${esc(url)}');`);
      break;
    }

    case "click": {
      if (!step.selector) {
        lines.push(`    // WARNING: click step has no selector — skipped`);
        break;
      }
      const locator = renderLocator(parseSelector(step.selector));
      lines.push(`    await ${locator}.click();`);
      break;
    }

    case "fill": {
      if (!step.selector) {
        lines.push(`    // WARNING: fill step has no selector — skipped`);
        break;
      }
      const locator = renderLocator(parseSelector(step.selector));
      const value = step.value ?? "";
      lines.push(`    await ${locator}.fill('${esc(value)}');`);
      break;
    }

    case "press": {
      const key = step.value ?? "Enter";
      if (step.selector) {
        const locator = renderLocator(parseSelector(step.selector));
        lines.push(`    await ${locator}.press('${esc(key)}');`);
      } else {
        // Press on the page/keyboard directly
        lines.push(`    await page.keyboard.press('${esc(key)}');`);
      }
      break;
    }

    case "expect": {
      renderExpectStep(step, spec, lines);
      break;
    }

    default: {
      lines.push(`    // Unrecognised action: ${(step as Step).action}`);
    }
  }

  return lines;
}

/** Render an expect step, choosing the correct web-first assertion. */
function renderExpectStep(step: Step, spec: TestSpec, lines: string[]): void {
  const assertion = step.assertion;

  if (assertion === "haveURL") {
    const expected = step.expected ?? spec.url;
    lines.push(`    await expect(page).toHaveURL('${esc(expected)}');`);
    return;
  }

  // All other assertions target a locator
  if (!step.selector) {
    lines.push(
      `    // WARNING: expect step has no selector — asserting page title instead`,
    );
    const expected = step.expected ?? "";
    lines.push(`    await expect(page).toHaveTitle(/${esc(expected)}/);`);
    return;
  }

  const locator = renderLocator(parseSelector(step.selector));

  switch (assertion) {
    case "visible":
      lines.push(`    await expect(${locator}).toBeVisible();`);
      break;
    case "hidden":
      lines.push(`    await expect(${locator}).toBeHidden();`);
      break;
    case "haveText": {
      const expected = step.expected ?? "";
      lines.push(
        `    await expect(${locator}).toHaveText('${esc(expected)}');`,
      );
      break;
    }
    default: {
      // Fallback: just assert visible
      lines.push(`    await expect(${locator}).toBeVisible();`);
    }
  }
}

// ── Main export ────────────────────────────────────────────────────

/**
 * Render a validated TestSpec to a complete @playwright/test `.spec.ts` source.
 *
 * The output is deterministic and does not depend on any external state.
 */
export function render(spec: TestSpec): string {
  const extraImports = spec.imports.length > 0
    ? spec.imports.map((i) => `import ${i};`).join("\n") + "\n"
    : "";

  // Render all steps, flattening the nested arrays
  const stepLines = spec.steps.flatMap((step) => renderStep(step, spec));

  const testBody = stepLines.join("\n");

  return [
    `import { test, expect } from '@playwright/test';`,
    extraImports ? extraImports : "",
    `// Generated by ai-testgen — do not edit by hand`,
    `// Target: ${spec.url}`,
    ``,
    `test('${esc(spec.title)}', async ({ page }) => {`,
    testBody,
    `});`,
    ``,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
