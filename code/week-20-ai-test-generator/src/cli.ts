#!/usr/bin/env tsx
/**
 * cli.ts — entry point for ai-testgen
 *
 * Usage:
 *   npx ai-testgen <url> [--out <path>] [--task <description>]
 *
 * What it does:
 *   1. Launch a headless Chromium browser via Playwright
 *   2. Navigate to the target URL
 *   3. Capture the accessibility snapshot (a11y tree)
 *   4. Call Claude to generate a TestSpec (with cached system prompt)
 *   5. Render the TestSpec to a .spec.ts source string
 *   6. Write the file to --out (default: tests/generated.spec.ts)
 *   7. Run the spec with `npx playwright test`
 *   8. If it fails, attempt one self-heal via heal()
 *   9. Print cost summary
 */

import "dotenv/config"; // load .env before anything else
import { program } from "commander";
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generate } from "./generate.js";
import type { UsageStats } from "./generate.js";
import { render } from "./render.js";
import { verify } from "./verify.js";
import { heal } from "./heal.js";

// ── CLI definition ────────────────────────────────────────────────────

program
  .name("ai-testgen")
  .description("Generate a Playwright spec for any URL using Claude")
  .version("0.1.0")
  .argument("<url>", "The URL to generate a test for")
  .option(
    "--out <path>",
    "Output path for the .spec.ts file",
    "tests/generated.spec.ts",
  )
  .option(
    "--task <desc>",
    "Optional description of the user flow to test",
  )
  .parse(process.argv);

const [url] = program.args as [string];
const opts = program.opts<{ out: string; task?: string }>();
const outPath = resolve(process.cwd(), opts.out);

// ── Main ──────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // Validate ANTHROPIC_API_KEY early so we don't waste time launching a browser
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Error: ANTHROPIC_API_KEY is not set.");
    console.error("Copy .env.example → .env and add your key.");
    process.exit(1);
  }

  console.log(`\nai-testgen — generating Playwright spec for: ${url}`);
  console.log(`Output: ${outPath}\n`);

  // ── Step 1: Visit the URL and capture the accessibility tree ──────────────
  console.log("1/4  Launching browser and capturing a11y snapshot…");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let a11ySnapshot: string;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Wait briefly for any JS-rendered content to settle
    await page.waitForTimeout(1500);

    // Capture the accessibility tree as a structured string
    const snapshotObj = await page.accessibility.snapshot();
    a11ySnapshot = snapshotObj
      ? JSON.stringify(snapshotObj, null, 2)
      : "(empty — page may be fully JS-rendered or behind auth)";
  } finally {
    await browser.close();
  }

  // ── Step 2: Generate TestSpec via Claude ─────────────────────────────
  console.log("2/4  Calling Claude to generate the test spec…");

  const totalUsage: UsageStats = {
    inputTokens: 0,
    outputTokens: 0,
    cacheWriteTokens: 0,
    cacheReadTokens: 0,
    estimatedCostUSD: 0,
  };

  const { spec, usage: genUsage } = await generate({
    url,
    a11ySnapshot,
    task: opts.task,
  });

  addUsage(totalUsage, genUsage);

  console.log(`     Generated: "${spec.title}" (${spec.steps.length} steps)`);

  // ── Step 3: Render → write the .spec.ts file ─────────────────────────
  console.log("3/4  Rendering spec and writing file…");

  let specSource = render(spec);

  // Ensure the output directory exists
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, specSource, "utf-8");

  console.log(`     Written: ${outPath}`);

  // ── Step 4: Verify with Playwright ───────────────────────────────
  console.log("4/4  Running: npx playwright test…");

  const { passed, output } = await verify(outPath);

  if (passed) {
    console.log("     ✓ Tests passed!\n");
  } else {
    console.log("     ✗ Tests failed — attempting one self-heal…\n");
    console.log("── Playwright output ──────────────────────────────");
    console.log(output);
    console.log("──────────────────────────────────────────────────\n");

    // ── Healing pass ─────────────────────────────────────────────────
    const { source: healedSource, usage: healUsage } = await heal(
      specSource,
      output,
    );

    addUsage(totalUsage, healUsage);
    specSource = healedSource;

    // Overwrite the file with the healed version
    writeFileSync(outPath, specSource, "utf-8");
    console.log(`     Healed spec written: ${outPath}`);

    // Re-run once to report final status
    const { passed: passedAfterHeal, output: healOutput } =
      await verify(outPath);

    if (passedAfterHeal) {
      console.log("     ✓ Tests passed after healing!\n");
    } else {
      console.log("     ✗ Tests still failing after healing.\n");
      console.log("── Post-heal Playwright output ───────────────────────");
      console.log(healOutput);
      console.log("──────────────────────────────────────────────\n");
      console.log("Tip: inspect the spec and fix remaining issues manually.");
    }
  }

  // ── Cost summary ─────────────────────────────────────────────────
  printCostSummary(totalUsage);
}

// ── Helpers ───────────────────────────────────────────────────────

/** Accumulate usage stats in-place. */
function addUsage(acc: UsageStats, delta: UsageStats): void {
  acc.inputTokens += delta.inputTokens;
  acc.outputTokens += delta.outputTokens;
  acc.cacheWriteTokens += delta.cacheWriteTokens;
  acc.cacheReadTokens += delta.cacheReadTokens;
  acc.estimatedCostUSD += delta.estimatedCostUSD;
}

/** Print a human-readable cost summary. */
function printCostSummary(usage: UsageStats): void {
  console.log("── Cost summary ────────────────────────────────────");
  console.log(`   Input tokens:       ${usage.inputTokens.toLocaleString()}`);
  console.log(
    `   Cache writes:       ${usage.cacheWriteTokens.toLocaleString()}`,
  );
  console.log(
    `   Cache reads:        ${usage.cacheReadTokens.toLocaleString()}`,
  );
  console.log(`   Output tokens:      ${usage.outputTokens.toLocaleString()}`);
  console.log(
    `   Estimated cost:     $${usage.estimatedCostUSD.toFixed(4)} USD`,
  );
  console.log("─────────────────────────────────────────────────────\n");
}

// ── Run ──────────────────────────────────────────────────────────

main().catch((err: unknown) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
