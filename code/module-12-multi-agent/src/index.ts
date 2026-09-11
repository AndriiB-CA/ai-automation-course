import "dotenv/config";
import { runManager } from "./manager.js";
import { formatCost } from "./models.js";

const goal =
  process.argv.slice(2).join(" ") ||
  "What are the main Playwright best practices for handling flaky tests?";

runManager(goal)
  .then(({ report, usage }) => {
    console.log(`\n${"=".repeat(70)}`);
    console.log("FINAL REPORT");
    console.log("=".repeat(70));
    console.log(report);
    console.log(`\n${"=".repeat(70)}`);
    console.log(`Total cost: ${formatCost(usage)}`);
    console.log(`Tokens in: ${usage.inputTokens.toLocaleString()} | out: ${usage.outputTokens.toLocaleString()}`);
    console.log("=".repeat(70));
  })
  .catch((err: unknown) => {
    // Never print process.env.LLM_API_KEY — only the message is surfaced
    const message = err instanceof Error ? err.message : String(err);
    console.error("Fatal error:", message);
    process.exit(1);
  });
