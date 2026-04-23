#!/usr/bin/env node
/**
 * CI regression check.
 * Compares current eval results against a stored baseline from main.
 *
 * Exits with code 1 (failing the workflow) if:
 *  - Pass rate on the current run is below (baseline_pass_rate - tolerance)
 *  - Any high-importance test that was passing in main is now failing
 *
 * Run after `promptfoo eval` in CI.
 */

import fs from "node:fs";
import path from "node:path";

const TOLERANCE = 0.05; // allow 5% pass-rate drop before failing
const RESULTS_PATH = "results.json";
const BASELINE_PATH = "eval-baseline.json"; // committed to main

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function summarize(results) {
  const stats = results?.results?.stats;
  const allResults = results?.results?.results ?? [];

  const total = stats?.tokenUsage?.numRequests ?? allResults.length;
  const passed = allResults.filter((r) => r.success).length;
  const passRate = total > 0 ? passed / total : 0;
  const totalCost = stats?.totalCost ?? 0;

  const failingTests = allResults
    .filter((r) => !r.success)
    .map((r) => r.description || r.testCase?.description || "(no description)");

  return { total, passed, passRate, totalCost, failingTests };
}

const current = loadJson(RESULTS_PATH);
const baseline = loadJson(BASELINE_PATH);

if (!current) {
  console.error("No current results found at", RESULTS_PATH);
  process.exit(2);
}

const currentStats = summarize(current);
console.log("\n=== Current run ===");
console.log(`  Total:    ${currentStats.total}`);
console.log(`  Passed:   ${currentStats.passed}`);
console.log(`  Pass %:   ${(currentStats.passRate * 100).toFixed(1)}%`);
console.log(`  Cost:     $${currentStats.totalCost.toFixed(4)}`);

if (!baseline) {
  console.warn("\n⚠ No baseline found at", BASELINE_PATH);
  console.warn("  First run — accepting current results as baseline.");
  console.warn("  Commit this file to main to gate future PRs.");
  fs.writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2));
  process.exit(0);
}

const baselineStats = summarize(baseline);
console.log("\n=== Baseline (from main) ===");
console.log(`  Total:    ${baselineStats.total}`);
console.log(`  Passed:   ${baselineStats.passed}`);
console.log(`  Pass %:   ${(baselineStats.passRate * 100).toFixed(1)}%`);

const drop = baselineStats.passRate - currentStats.passRate;
console.log(`\n=== Delta ===`);
console.log(`  Pass rate change: ${drop > 0 ? "-" : "+"}${Math.abs(drop * 100).toFixed(1)}%`);
console.log(`  Cost change:      ${((currentStats.totalCost - baselineStats.totalCost) / baselineStats.totalCost * 100 || 0).toFixed(1)}%`);

if (drop > TOLERANCE) {
  console.error(`\n❌ FAILED: pass rate dropped by ${(drop * 100).toFixed(1)}% (tolerance: ${TOLERANCE * 100}%)`);
  console.error("Failing tests:");
  currentStats.failingTests.forEach((t) => console.error(`  - ${t}`));
  process.exit(1);
}

if (currentStats.failingTests.length > baselineStats.failingTests.length) {
  const newFailures = currentStats.failingTests.filter(
    (t) => !baselineStats.failingTests.includes(t)
  );
  if (newFailures.length > 0) {
    console.error(`\n❌ FAILED: ${newFailures.length} previously-passing tests now fail:`);
    newFailures.forEach((t) => console.error(`  - ${t}`));
    process.exit(1);
  }
}

console.log("\n✓ No regression detected. PR is safe to merge.");
process.exit(0);
