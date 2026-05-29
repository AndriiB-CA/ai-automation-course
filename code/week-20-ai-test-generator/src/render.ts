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
 */

import type { TestSpec, Step } from "./schemas.js";

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
  role?: string;
  value: string;
}

function parseSelector(selector: string): ParsedSelector {
  const match = selector.match(/^([^\[]+)\[(.+)\]$/s);
  if (!match) return { type: "raw", value: selector };

  const prefix = match[1].trim().toLowerCase();
  const value = match[2].trim();

  if (prefix === "testid") return { type: "testid", value };
  if (prefix === "label") return { type: "label", value };
  if (prefix === "placeholder") return { type: "placeholder", value };
  if (prefix === "text") return { type: "text", value };
  if (prefix === "alt") return { type: "alt", value };
  if (ARIA_ROLES.has(prefix)) return { type: "role", role: prefix, value };

  return { type: "raw", value: selector };
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function renderLocator(parsed: ParsedSelector): string {
  switch (parsed.type) {
    case "role": return `page.getByRole('${parsed.role}', { name: '${esc(parsed.value)}' })`;
    case "testid": return `page.getByTestId('${esc(parsed.value)}')`;
    case "label": return `page.getByLabel('${esc(parsed.value)}')`;
    case "placeholder": return `page.getByPlaceholder('${esc(parsed.value)}')`;
    case "text": return `page.getByText('${esc(parsed.value)}')`;
    case "alt": return `page.getByAltText('${esc(parsed.value)}')`;
    default: return `page.locator('${esc(parsed.value)}')`;
  }
}

function renderExpectStep(step: Step, spec: TestSpec, lines: string[]): void {
  const assertion = step.assertion;

  if (assertion === "haveURL") {
    lines.push(`    await expect(page).toHaveURL('${esc(step.expected ?? spec.url)}');`);
    return;
  }

  if (!step.selector) {
    lines.push(`    // WARNING: expect step has no selector — asserting page title instead`);
    lines.push(`    await expect(page).toHaveTitle(/${esc(step.expected ?? "")}/);`);
    return;
  }

  const locator = renderLocator(parseSelector(step.selector));

  switch (assertion) {
    case "visible": lines.push(`    await expect(${locator}).toBeVisible();`); break;
    case "hidden": lines.push(`    await expect(${locator}).toBeHidden();`); break;
    case "haveText": lines.push(`    await expect(${locator}).toHaveText('${esc(step.expected ?? "")}');`); break;
    default: lines.push(`    await expect(${locator}).toBeVisible();`);
  }
}

function renderStep(step: Step, spec: TestSpec): string[] {
  const lines: string[] = [`    // ${step.description}`];

  switch (step.action) {
    case "goto":
      lines.push(`    await page.goto('${esc(step.value ?? spec.url)}');`);
      break;
    case "click":
      if (!step.selector) { lines.push(`    // WARNING: click step has no selector — skipped`); break; }
      lines.push(`    await ${renderLocator(parseSelector(step.selector))}.click();`);
      break;
    case "fill":
      if (!step.selector) { lines.push(`    // WARNING: fill step has no selector — skipped`); break; }
      lines.push(`    await ${renderLocator(parseSelector(step.selector))}.fill('${esc(step.value ?? "")}');`);
      break;
    case "press": {
      const key = step.value ?? "Enter";
      if (step.selector) lines.push(`    await ${renderLocator(parseSelector(step.selector))}.press('${esc(key)}');`);
      else lines.push(`    await page.keyboard.press('${esc(key)}');`);
      break;
    }
    case "expect":
      renderExpectStep(step, spec, lines);
      break;
    default:
      lines.push(`    // Unrecognised action: ${(step as Step).action}`);
  }

  return lines;
}

export function render(spec: TestSpec): string {
  const extraImports = spec.imports.length > 0
    ? spec.imports.map((i) => `import ${i};`).join("\n") + "\n"
    : "";

  const stepLines = spec.steps.flatMap((step) => renderStep(step, spec));

  return [
    `import { test, expect } from '@playwright/test';`,
    extraImports ? extraImports : "",
    `// Generated by ai-testgen — do not edit by hand`,
    `// Target: ${spec.url}`,
    ``,
    `test('${esc(spec.title)}', async ({ page }) => {`,
    stepLines.join("\n"),
    `});`,
    ``,
  ].filter((line) => line !== undefined).join("\n");
}
