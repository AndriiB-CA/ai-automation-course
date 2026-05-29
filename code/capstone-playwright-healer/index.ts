#!/usr/bin/env tsx
/**
 * index.ts — CLI entry point + library re-export for playwright-healer.
 *
 * Sub-commands:
 *   init              Writes healer.config.json
 *   gen <url>         Generates a Playwright spec from a live URL
 *   watch             Wraps a test run; patches in HealingLocator on failure
 *   apply <heal-id>   Applies a recorded heal proposal to the spec file
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";

import { client, computeCost, extractText, MODEL_GEN } from "./llm.ts";
import { TestSpecSchema, HealRecordSchema } from "./schemas.ts";

export { HealingLocator, heal } from "./src-heal-locator.ts";
export type { HealProposal, HealRecord } from "./src-heal-locator.ts";
export { computeCost, client, MODEL_GEN } from "./llm.ts";
export { TestSpecSchema, HealProposalSchema, HealRecordSchema } from "./schemas.ts";
export type { TestSpec, HealProposal as HealProposalZod, HealRecord as HealRecordZod } from "./schemas.ts";

interface HealerConfig {
  healModel: string;
  genModel: string;
  confidenceThreshold: number;
  recordsDir: string;
  allowedSpecGlobs: string[];
}

const DEFAULT_CONFIG: HealerConfig = {
  healModel: "claude-sonnet-4-6",
  genModel: "claude-sonnet-4-6",
  confidenceThreshold: parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD ?? "0.7"),
  recordsDir: ".healer",
  allowedSpecGlobs: ["**/*.spec.ts", "**/*.spec.js"],
};

async function runInit(): Promise<void> {
  const configPath = path.resolve("healer.config.json");
  try {
    await fs.access(configPath);
    console.log(`healer.config.json already exists at ${configPath} — skipping.`);
    return;
  } catch { /* proceed to create */ }
  await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  console.log(`Created ${configPath}`);
  console.log("Next: set ANTHROPIC_API_KEY in .env (copy .env.example) and run `npm test`.");
}

async function generate(url: string, outFile: string): Promise<void> {
  const { chromium } = await import("@playwright/test");

  console.log(`Launching browser to snapshot ${url} …`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    const ariaSnapshot = await page.locator("body").ariaSnapshot();

    console.log("Asking Claude to generate a TestSpec …");

    const SYSTEM = `You are a Playwright test author. Given an ARIA accessibility snapshot of
a web page, produce a JSON object that conforms to the TestSpec schema below.

Rules:
- Use role= selectors wherever possible (most resilient).
- Use data-testid= for elements that have one.
- Avoid CSS or XPath unless there is no accessible alternative.
- Cover the primary user flow visible on the page.
- steps must be a non-empty array.

Return ONLY valid JSON — no markdown fences, no explanation.

TestSpec schema (TypeScript):
{
  title: string;
  url: string;
  steps: Array<{
    description: string;
    action: "navigate" | "click" | "fill" | "select" | "expect" | "screenshot" | "wait";
    selector?: string;
    value?: string;
    expected?: string;
  }>;
  notes?: string;
}`;

    const msg = await client.messages.create({
      model: MODEL_GEN,
      max_tokens: 2048,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: `URL: ${url}\n\nARIA snapshot:\n${ariaSnapshot.slice(0, 6000)}` }],
    });

    const cost = computeCost(msg.usage, MODEL_GEN);
    console.log(`LLM cost: $${cost.toFixed(6)}`);

    const rawJson = extractText(msg).trim();
    const spec = TestSpecSchema.parse(JSON.parse(rawJson));
    const specSource = renderSpec(spec);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, specSource, "utf8");
    console.log(`Wrote ${outFile} (${spec.steps.length} steps)`);
  } finally {
    await browser.close();
  }
}

function renderSpec(spec: import("./schemas.ts").TestSpec): string {
  const steps = spec.steps
    .map((step) => {
      switch (step.action) {
        case "navigate": return `  // ${step.description}\n  await page.goto(${JSON.stringify(step.value ?? spec.url)});`;
        case "click": return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).click();`;
        case "fill": return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).fill(${JSON.stringify(step.value ?? "")});`;
        case "select": return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).selectOption(${JSON.stringify(step.value ?? "")});`;
        case "expect": return `  // ${step.description}\n  await expect(page.locator(${JSON.stringify(step.selector ?? "")})).toContainText(${JSON.stringify(step.expected ?? "")});`;
        case "screenshot": return `  // ${step.description}\n  await page.screenshot({ path: "screenshot.png" });`;
        case "wait": return `  // ${step.description}\n  await page.waitForLoadState("networkidle");`;
        default: return `  // TODO: ${step.description}`;
      }
    })
    .join("\n\n");

  return `import { test, expect } from "@playwright/test";
// Generated by playwright-healer gen — review before committing.
${spec.notes ? `// Notes: ${spec.notes}\n` : ""}
test(${JSON.stringify(spec.title)}, async ({ page }) => {
${steps}
});
`;
}

async function runWatch(testArgs: string[]): Promise<void> {
  const cmd = testArgs.length > 0 ? testArgs.join(" ") : "npx playwright test";
  console.log(`[healer] Running: ${cmd}`);
  console.log("[healer] HealingLocator is active — import { heal } in your specs.");

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("[healer] All tests passed — no heals needed.");
  } catch {
    const recordsDir = DEFAULT_CONFIG.recordsDir;
    let proposals: string[] = [];
    try {
      proposals = (await fs.readdir(recordsDir)).filter((f) => f.endsWith(".json"));
    } catch { /* .healer/ doesn't exist */ }

    if (proposals.length === 0) {
      console.log("[healer] Tests failed but no heal proposals were emitted.");
      console.log("         Are you using heal() in your specs? See README for usage.");
    } else {
      console.log(`\n[healer] ${proposals.length} heal proposal(s) recorded:`);
      for (const file of proposals) {
        const id = path.basename(file, ".json");
        console.log(`  ${id}  →  run: playwright-healer apply ${id}`);
      }
    }
    process.exitCode = 1;
  }
}

async function runApply(healId: string, opts: { yes?: boolean }): Promise<void> {
  const recordsDir = DEFAULT_CONFIG.recordsDir;
  const recordPath = path.resolve(recordsDir, `${healId}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(recordPath, "utf8");
  } catch {
    console.error(`No heal record found for id "${healId}" (looked in ${recordPath}).`);
    process.exit(1);
  }

  const record = HealRecordSchema.parse(JSON.parse(raw));
  const { proposal, intent, testFile, lineNumber } = record;

  console.log("-".repeat(60));
  console.log(`Heal proposal: ${healId}`);
  console.log(`  Intent      : ${intent}`);
  console.log(`  Confidence  : ${(proposal.confidence * 100).toFixed(0)}%`);
  console.log(`  Type        : ${proposal.selectorType}`);
  console.log(`  Old selector: ${proposal.oldSelector ?? "(not recorded)"}`);
  console.log(`  New selector: ${proposal.suggestedSelector}`);
  console.log(`  Rationale   : ${proposal.rationale}`);
  if (testFile) console.log(`  File        : ${testFile}${lineNumber ? `:${lineNumber}` : ""}`);
  console.log("-".repeat(60));

  if (!opts.yes) {
    console.log("\nDry-run mode — pass --yes to apply the change to the spec file.");
    return;
  }

  if (!testFile) { console.error("Cannot apply: no testFile recorded."); process.exit(1); }

  const isAllowed = DEFAULT_CONFIG.allowedSpecGlobs.some(
    () => testFile.endsWith(".spec.ts") || testFile.endsWith(".spec.js"),
  );
  if (!isAllowed) { console.error(`Security: ${testFile} does not match allowedSpecGlobs. Refusing.`); process.exit(1); }

  if (!proposal.oldSelector) { console.error("Cannot apply: oldSelector not recorded."); process.exit(1); }

  const src = await fs.readFile(testFile, "utf8");
  if (!src.includes(proposal.oldSelector)) { console.error(`Cannot apply: oldSelector not found in ${testFile}.`); process.exit(1); }

  const patched = src.replaceAll(proposal.oldSelector, proposal.suggestedSelector);
  await fs.writeFile(testFile, patched, "utf8");
  console.log(`Applied heal to ${testFile}`);
}

const program = new Command();

program.name("playwright-healer").description("AI-powered self-healing Playwright locators.").version("0.1.0");

program.command("init").description("Initialise healer.config.json").action(() => runInit().catch(die));

program.command("gen <url>").description("Generate a Playwright spec from a live URL")
  .option("-o, --out <file>", "Output file path", "tests/generated.spec.ts")
  .action((url: string, opts: { out: string }) => generate(url, opts.out).catch(die));

program.command("watch").description("Wrap a Playwright test run — emit heal proposals on failure.")
  .allowUnknownOptions().argument("[testArgs...]", "Args passed to test runner")
  .action((_args: string[], _opts: object, cmd: Command) => runWatch(cmd.args ?? []).catch(die));

program.command("apply <heal-id>").description("Apply a recorded heal proposal (dry-run by default)")
  .option("-y, --yes", "Actually write the change")
  .action((healId: string, opts: { yes?: boolean }) => runApply(healId, opts).catch(die));

function die(err: unknown): never {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

const isMain = process.argv[1] !== undefined &&
  (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"));

if (isMain) program.parse(process.argv);
