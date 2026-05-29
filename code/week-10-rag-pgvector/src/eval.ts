/**
 * Retrieval evaluation — measures Recall@5 over a labeled query set.
 *
 * Run: npm run eval
 *
 * Input: ./queries.json  (array of { query: string, expected_document_ids: string[] })
 * Output: per-query results and mean Recall@5 printed to stdout.
 *
 * Recall@K = (# expected docs that appear in top-K results) / (# expected docs)
 * A result "appears" if its document_id matches any expected_document_id.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import { pool } from "./db.js";
import { semanticSearch } from "./search.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface LabeledQuery {
  query: string;
  expected_document_ids: string[];
}

// ---------------------------------------------------------------------------
// Recall@K for a single query
// ---------------------------------------------------------------------------
function recallAtK(
  expectedIds: string[],
  results: Array<{ document_id: string }>,
  k: number
): number {
  if (expectedIds.length === 0) return 1; // nothing to recall → trivially 1
  const returnedIds = new Set(results.slice(0, k).map((r) => r.document_id));
  const hits = expectedIds.filter((id) => returnedIds.has(id)).length;
  return hits / expectedIds.length;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const K = 5;

  // Load labeled queries
  const raw = await fs.readFile("./queries.json", "utf8");
  const queries: LabeledQuery[] = JSON.parse(raw);
  console.log(`Loaded ${queries.length} labeled quer${queries.length === 1 ? "y" : "ies"}.\n`);

  const recalls: number[] = [];

  for (let i = 0; i < queries.length; i++) {
    const { query, expected_document_ids } = queries[i];
    const results = await semanticSearch(query, K);
    const recall = recallAtK(expected_document_ids, results, K);
    recalls.push(recall);

    const hitIds = results.slice(0, K).map((r) => r.document_id);
    console.log(`Query ${i + 1}: "${query}"`);
    console.log(`  Expected : ${expected_document_ids.join(", ")}`);
    console.log(`  Retrieved: ${hitIds.join(", ")}`);
    console.log(`  Recall@${K}: ${(recall * 100).toFixed(1)}%\n`);
  }

  const meanRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
  console.log("─".repeat(50));
  console.log(`Mean Recall@${K}: ${(meanRecall * 100).toFixed(1)}%  (${queries.length} queries)`);
  console.log("─".repeat(50));

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
