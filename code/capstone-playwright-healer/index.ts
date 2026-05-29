#!/usr/bin/env tsx
/**
 * index.ts — CLI entry point + library re-export for playwright-healer.
 *
 * As a CLI (via `npx playwright-healer` or `npm start`):
 *   init              Writes healer.config.json into the current project.
 *   gen <url>         Generates a Playwright spec from a live URL.
 *   watch             Wraps a test run; patches in HealingLocator on failure.
 *   apply <heal-id>   Applies a recorded heal proposal to the spec file.
 *
 * As a library (via `import { heal } from "playwright-healer"`):
 *   heal()            Drop-in factory for self-healing locators.
 *   HealingLocator    Full class, if you need more control.
 */

import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";
import { Command } from "commander";

import { client, computeCost, extractText, MODEL_GEN } from "./llm.ts";
import { TestSpecSchema, HealRecordSchema } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Library re-exports — keeps README usage (`import { heal } from "playwright-healer"`)
// coherent when the package is consumed as a library rather than a CLI.
// ---------------------------------------------------------------------------
export { HealingLocator, heal } from "./src-heal-locator.ts";
export type { HealProposal, HealRecord } from "./src-heal-locator.ts";
export { computeCost, client, MODEL_GEN } from "./llm.ts";
export { TestSpecSchema, HealProposalSchema, HealRecordSchema } from "./schemas.ts";
export type { TestSpec, HealProposal as HealProposalZod, HealRecord as HealRecordZod } from "./schemas.ts";

// ---------------------------------------------------------------------------
// Default healer config shape
// ---------------------------------------------------------------------------

interface HealerConfig {
  /** Model used for locator healing (sonnet by default). */
  healModel: string;
  /** Model used for spec generation (sonnet by default). */
  genModel: string;
  /** Auto-apply proposals at or above this confidence (0–1). */
  confidenceThreshold: number;
  /** Directory where heal records are persisted. */
  recordsDir: string;
  /** Glob patterns for spec files the healer is allowed to modify. */
  allowedSpecGlobs: string[];
}

const DEFAULT_CONFIG: HealerConfig = {
  healModel: "claude-sonnet-4-6",
  genModel: "claude-sonnet-4-6",
  confidenceThreshold: parseFloat(process.env.HEAL_CONFIDENCE_THRESHOLD ?? "0.7"),
  recordsDir: ".healer",
  // Security: only .spec.ts / .spec.js files are writable — see SECURITY.md
  allowedSpecGlobs: ["**/*.spec.ts", "**/*.spec.js"],
};

// ---------------------------------------------------------------------------
// Sub-command: init
// ---------------------------------------------------------------------------

async function runInit(): Promise<void> {
  const configPath = path.resolve("healer.config.json");

  try {
    await fs.access(configPath);
    console.log(`healer.config.json already exists at ${configPath} — skipping.`);
    return;
  } catch {
    // File doesn't exist; proceed to create it.
  }

  await fs.writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2) + "\n");
  console.log(`Created ${configPath}`);
  console.log(
    "Next: set ANTHROPIC_API_KEY in .env (copy .env.example) and run `npm test`.",
  );
}

// ---------------------------------------------------------------------------
// Sub-command: gen <url>
// ---------------------------------------------------------------------------

/**
 * Minimal generate implementation — uses the Playwright accessibility
 * snapshot (via a lightweight chromium launch) + Claude to produce a TestSpec,
 * then renders it to a .spec.ts file.
 *
 * A full implementation would: paginate multi-step flows, deduplicate
 * selectors, and integrate render.ts. This stub covers the happy path for a
 * single-page URL so the CLI is actually useful from day one.
 */
async function generate(url: string, outFile: string): Promise<void> {
  // Dynamically import Playwright so the library surface doesn't force a
  // browser dependency when the package is used purely for healing.
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
  title: string;          // Short test title
  url: string;            // The crawled URL
  steps: Array<{
    description: string;  // Human-readable step description
    action: "navigate" | "click" | "fill" | "select" | "expect" | "screenshot" | "wait";
    selector?: string;    // Playwright locator string
    value?: string;       // For fill/select
    expected?: string;    // For expect
  }>;
  notes?: string;         // Optional reviewer notes
}`;

    const msg = await client.messages.create({
      model: MODEL_GEN,
      max_tokens: 2048,
      system: [
        // Cache the system prompt — it's static across all gen calls.
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      messages: [
        {
          role: "user",
          content: `URL: ${url}\n\nARIA snapshot:\n${ariaSnapshot.slice(0, 6000)}`,
        },
      ],
    });

    const cost = computeCost(msg.usage, MODEL_GEN);
    console.log(`LLM cost: $${cost.toFixed(6)}`);

    const rawJson = extractText(msg).trim();
    const spec = TestSpecSchema.parse(JSON.parse(rawJson));

    // Render to a .spec.ts file
    const specSource = renderSpec(spec);
    await fs.mkdir(path.dirname(outFile), { recursive: true });
    await fs.writeFile(outFile, specSource, "utf8");
    console.log(`Wrote ${outFile} (${spec.steps.length} steps)`);
  } finally {
    await browser.close();
  }
}

/**
 * Converts a validated TestSpec into a runnable Playwright .spec.ts string.
 * A full implementation would live in its own render.ts module.
 */
function renderSpec(spec: import("./schemas.ts").TestSpec): string {
  const steps = spec.steps
    .map((step) => {
      switch (step.action) {
        case "navigate":
          return `  // ${step.description}\n  await page.goto(${JSON.stringify(step.value ?? spec.url)});`;
        case "click":
          return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).click();`;
        case "fill":
          return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).fill(${JSON.stringify(step.value ?? "")});`;
        case "select":
          return `  // ${step.description}\n  await page.locator(${JSON.stringify(step.selector ?? "")}).selectOption(${JSON.stringify(step.value ?? "")});`;
        case "expect":
          return `  // ${step.description}\n  await expect(page.locator(${JSON.stringify(step.selector ?? "")})).toContainText(${JSON.stringify(step.expected ?? "")});`;
        case "screenshot":
          return `  // ${step.description}\n  await page.screenshot({ path: "screenshot.png" });`;
        case "wait":
          return `  // ${step.description}\n  await page.waitForLoadState("networkidle");`;
        default:
          return `  // TODO: ${step.description}`;
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

// ---------------------------------------------------------------------------
// Sub-command: watch
// ---------------------------------------------------------------------------

/**
 * Wraps any Playwright test command. On completion, scans .healer/ for new
 * proposals and prints a summary. The full implementation would patch the
 * Playwright reporter to intercept failures in real time.
 *
 * TODO: wire into @playwright/test reporter API for real-time heal proposals.
 */
async function runWatch(testArgs: string[]): Promise<void> {
  const cmd = testArgs.length > 0 ? testArgs.join(" ") : "npx playwright test";
  console.log(`[healer] Running: ${cmd}`);
  console.log("[healer] HealingLocator is active — import { heal } in your specs.");

  try {
    execSync(cmd, { stdio: "inherit" });
    console.log("[healer] All tests passed — no heals needed.");
  } catch {
    // Tests failed; check for heal proposals
    const recordsDir = DEFAULT_CONFIG.recordsDir;
    let proposals: string[] = [];
    try {
      proposals = (await fs.readdir(recordsDir)).filter((f) =>
        f.endsWith(".json"),
      );
    } catch {
      // .healer/ doesn't exist yet — no proposals written
    }

    if (proposals.length === 0) {
      console.log("[healer] Tests failed but no heal proposals were emitted.");
      console.log(
        "         Are you using heal() in your specs? See README for usage.",
      );
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

// ---------------------------------------------------------------------------
// Sub-command: apply <heal-id>
// ---------------------------------------------------------------------------

/**
 * Reads a recorded heal proposal and prints what it would change.
 * Applies the selector replacement to the spec file when --yes is passed.
 *
 * Security invariant: only files matching allowedSpecGlobs may be modified.
 * See SECURITY.md for the full policy.
 */
async function runApply(healId: string, opts: { yes?: boolean }): Promise<void> {
  const recordsDir = DEFAULT_CONFIG.recordsDir;
  const recordPath = path.resolve(recordsDir, `${healId}.json`);

  let raw: string;
  try {
    raw = await fs.readFile(recordPath, "utf8");
  } catch {
    console.error(
      `No heal record found for id "${healId}" (looked in ${recordPath}).`,
    );
    console.error(
      "Run `playwright-healer watch` to generate proposals, then retry.",
    );
    process.exit(1);
  }

  // Validate the record against the canonical schema
  const record = HealRecordSchema.parse(JSON.parse(raw));
  const { proposal, intent, testFile, lineNumber } = record;

  console.log("─".repeat(60));
  console.log(`Heal proposal: ${healId}`);
  console.log(`  Intent      : ${intent}`);
  console.log(`  Confidence  : ${(proposal.confidence * 100).toFixed(0)}%`);
  console.log(`  Type        : ${proposal.selectorType}`);
  console.log(`  Old selector: ${proposal.oldSelector ?? "(not recorded)"}`);
  console.log(`  New selector: ${proposal.suggestedSelector}`);
  console.log(`  Rationale   : ${proposal.rationale}`);
  if (testFile) console.log(`  File        : ${testFile}${lineNumber ? `:${lineNumber}` : ""}`);
  console.log("─".repeat(60));

  if (!opts.yes) {
    console.log(
      "\nDry-run mode — pass --yes to apply the change to the spec file.",
    );
    return;
  }

  if (!testFile) {
    console.error("Cannot apply: no testFile recorded in the proposal.");
    process.exit(1);
  }

  // Security check: only spec files
  const isAllowed = DEFAULT_CONFIG.allowedSpecGlobs.some(
    (glob) => testFile.endsWith(".spec.ts") || testFile.endsWith(".spec.js"),
  );
  if (!isAllowed) {
    console.error(
      `Security: ${testFile} does not match allowedSpecGlobs. Refusing to apply.`,
    );
    process.exit(1);
  }

  if (!proposal.oldSelector) {
    console.error(
      "Cannot apply: oldSelector was not recorded. Apply manually using the rationale above.",
    );
    process.exit(1);
  }

  const src = await fs.readFile(testFile, "utf8");
  if (!src.includes(proposal.oldSelector)) {
    console.error(
      `Cannot apply: oldSelector ${JSON.stringify(proposal.oldSelector)} not found in ${testFile}.`,
    );
    process.exit(1);
  }

  const patched = src.replaceAll(proposal.oldSelector, proposal.suggestedSelector);
  await fs.writeFile(testFile, patched, "utf8");
  console.log(`Applied heal to ${testFile}`);
}

// ---------------------------------------------------------------------------
// CLI wiring
// ---------------------------------------------------------------------------

const program = new Command();

program
  .name("playwright-healer")
  .description(
    "AI-powered self-healing Playwright locators — generate specs, heal broken selectors.",
  )
  .version("0.1.0");

program
  .command("init")
  .description("Initialise healer.config.json in the current project directory")
  .action(() => runInit().catch(die));

program
  .command("gen <url>")
  .description("Generate a Playwright spec from a live URL")
  .option("-o, --out <file>", "Output file path", "tests/generated.spec.ts")
  .action((url: string, opts: { out: string }) =>
    generate(url, opts.out).catch(die),
  );

program
  .command("watch")
  .description(
    "Wrap a Playwright test run — emit heal proposals on failure.\n" +
      "Usage: playwright-healer watch -- npx playwright test",
  )
  .allowUnknownOptions()
  .argument("[testArgs...]", "Arguments passed through to the test runner")
  .action((_args: string[], opts: object, cmd: Command) => {
    // commander puts passthrough args after -- into cmd.args
    const passthrough = cmd.args ?? [];
    runWatch(passthrough).catch(die);
  });

program
  .command("apply <heal-id>")
  .description(
    "Apply a recorded heal proposal to its spec file (dry-run by default)",
  )
  .option("-y, --yes", "Actually write the change; default is dry-run")
  .action((healId: string, opts: { yes?: boolean }) =>
    runApply(healId, opts).catch(die),
  );

function die(err: unknown): never {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}

// Only run the CLI when this file is the entry point (not when imported as a library).
// Under ESM + tsx the top-level await makes this the natural boundary.
const isMain =
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith("index.ts") || process.argv[1].endsWith("index.js"));

if (isMain) {
  program.parse(process.argv);
}
