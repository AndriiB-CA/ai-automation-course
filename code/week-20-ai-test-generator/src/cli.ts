#!/usr/bin/env tsx
/**
 * cli.ts — entry point for ai-testgen
 *
 * Usage: npx ai-testgen <url> [--out <path>] [--task <description>]
 *
 * Steps:
 *   1. Launch headless Chromium, navigate to URL
 *   2. Capture accessibility snapshot (a11y tree)
 *   3. Call the configured model to generate a TestSpec
 *   4. Render the TestSpec to a .spec.ts source string
 *   5. Write the file to --out (default: tests/generated.spec.ts)
 *   6. Run the spec with `npx playwright test`
 *   7. If it fails, attempt one self-heal via heal()
 *   8. Print cost summary
 */

import "dotenv/config";
import { program } from "commander";
import { chromium } from "@playwright/test";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { generate } from "./generate.js";
import type { UsageStats } from "./generate.js";
import { render } from "./render.js";
import { verify } from "./verify.js";
import { heal } from "./heal.js";

program
  .name("ai-testgen")
  .description("Generate a Playwright spec for any URL using an LLM")
  .version("0.1.0")
  .argument("<url>", "The URL to generate a test for")
  .option("--out <path>", "Output path for the .spec.ts file", "tests/generated.spec.ts")
  .option("--task <desc>", "Optional description of the user flow to test")
  .parse(process.argv);

const [url] = program.args as [string];
const opts = program.opts<{ out: string; task?: string }>();
const outPath = resolve(process.cwd(), opts.out);

async function main(): Promise<void> {
  if (!process.env.LLM_BASE_URL || !process.env.LLM_MODEL) {
    console.error("Error: LLM_BASE_URL and LLM_MODEL are not set. See PROVIDERS.md.");
    console.error("Copy .env.example → .env and add your key.");
    process.exit(1);
  }

  console.log(`\nai-testgen — generating Playwright spec for: ${url}`);
  console.log(`Output: ${outPath}\n`);

  console.log("1/4  Launching browser and capturing a11y snapshot…");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let a11ySnapshot: string;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.waitForTimeout(1500);
    // ariaSnapshot() returns the accessibility tree as YAML. It replaced the
    // removed page.accessibility API, and the YAML happens to be far cheaper
    // in tokens than the old JSON tree — the same information at ~half the cost.
    const snapshot = await page.locator("body").ariaSnapshot();
    a11ySnapshot = snapshot?.trim()
      ? snapshot
      : "(empty — page may be fully JS-rendered or behind auth)";
  } finally {
    await browser.close();
  }

  console.log("2/4  Calling the model to generate the test spec…");

  const totalUsage: UsageStats = { inputTokens: 0, outputTokens: 0, estimatedCostUSD: null };

  const { spec, usage: genUsage } = await generate({ url, a11ySnapshot, task: opts.task });
  addUsage(totalUsage, genUsage);
  console.log(`     Generated: "${spec.title}" (${spec.steps.length} steps)`);

  console.log("3/4  Rendering spec and writing file…");
  let specSource = render(spec);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, specSource, "utf-8");
  console.log(`     Written: ${outPath}`);

  console.log("4/4  Running: npx playwright test…");
  const { passed, output } = await verify(outPath);

  if (passed) {
    console.log("     ✓ Tests passed!\n");
  } else {
    console.log("     ✗ Tests failed — attempting one self-heal…\n");
    console.log("── Playwright output ────────────────────────────────────────────");
    console.log(output);
    console.log("─────────────────────────────────────────────────────────────────\n");

    const { source: healedSource, usage: healUsage } = await heal(specSource, output);
    addUsage(totalUsage, healUsage);
    specSource = healedSource;
    writeFileSync(outPath, specSource, "utf-8");
    console.log(`     Healed spec written: ${outPath}`);

    const { passed: passedAfterHeal, output: healOutput } = await verify(outPath);
    if (passedAfterHeal) {
      console.log("     ✓ Tests passed after healing!\n");
    } else {
      console.log("     ✗ Tests still failing after healing.\n");
      console.log("── Post-heal Playwright output ───────────────────────");
      console.log(healOutput);
      console.log("────────────────────────────────────────────────────────\n");
      console.log("Tip: inspect the spec and fix remaining issues manually.");
    }
  }

  printCostSummary(totalUsage);
}

function addUsage(acc: UsageStats, delta: UsageStats): void {
  acc.inputTokens += delta.inputTokens;
  acc.outputTokens += delta.outputTokens;
  // Cost is null until .env carries per-token prices. Keep it null rather than
  // coercing to 0, so an unpriced run reports "unknown" instead of "free".
  if (delta.estimatedCostUSD !== null) {
    acc.estimatedCostUSD = (acc.estimatedCostUSD ?? 0) + delta.estimatedCostUSD;
  }
}

function printCostSummary(usage: UsageStats): void {
  console.log("── Cost summary ───────────────────────────────────────────────");
  console.log(`   Input tokens:       ${usage.inputTokens.toLocaleString()}`);
  console.log(`   Output tokens:      ${usage.outputTokens.toLocaleString()}`);
  console.log(
    usage.estimatedCostUSD === null
      ? "   Estimated cost:     unknown — set LLM_PRICE_IN_PER_MTOK / LLM_PRICE_OUT_PER_MTOK"
      : `   Estimated cost:     $${usage.estimatedCostUSD.toFixed(4)} USD`,
  );
  console.log("─────────────────────────────────────────────────────────────\n");
}

main().catch((err: unknown) => {
  console.error("\nFatal error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
