/**
 * Week 11 measurement: Recall@5 for vector search, hybrid fusion, and
 * hybrid + a small-model rerank, on the same labeled queries.
 *
 *   npm run compare
 *
 * Reads ./queries.json — the same file as `npm run eval`.
 */
import "dotenv/config";
import fs from "node:fs/promises";
import { pool } from "./db.js";
import { rerank } from "./rerank.js";
import { hybridSearch, semanticSearch, type SearchResult } from "./search.js";

interface LabeledQuery {
  query: string;
  expected_document_ids: string[];
}

function recallAt5(expectedIds: string[], results: SearchResult[]): number {
  if (expectedIds.length === 0) return 1;
  const returned = new Set(results.slice(0, 5).map((r) => r.document_id));
  const hits = expectedIds.filter((id) => returned.has(id)).length;
  return hits / expectedIds.length;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, n) => s + n, 0) / values.length;
}

async function main(): Promise<void> {
  const raw = await fs.readFile(new URL("../queries.json", import.meta.url), "utf8");
  const queries = JSON.parse(raw) as LabeledQuery[];

  const vector: number[] = [];
  const hybrid: number[] = [];
  const reranked: number[] = [];

  for (const item of queries) {
    const byVector = await semanticSearch(item.query, 5);
    const byHybridWide = await hybridSearch(item.query, 20);
    const byHybrid = byHybridWide.slice(0, 5);
    const byRerank = await rerank(item.query, byHybridWide, 5);

    vector.push(recallAt5(item.expected_document_ids, byVector));
    hybrid.push(recallAt5(item.expected_document_ids, byHybrid));
    reranked.push(recallAt5(item.expected_document_ids, byRerank));

    console.log(
      `${item.query.slice(0, 48).padEnd(48)}  vector=${vector.at(-1)!.toFixed(2)}  hybrid=${hybrid.at(-1)!.toFixed(2)}  rerank=${reranked.at(-1)!.toFixed(2)}`,
    );
  }

  console.log("\nMean Recall@5");
  console.log(`  vector          ${mean(vector).toFixed(3)}`);
  console.log(`  hybrid (RRF)    ${mean(hybrid).toFixed(3)}`);
  console.log(`  hybrid + rerank ${mean(reranked).toFixed(3)}`);
  console.log("\nWrite these three numbers in your Week 11 report. Do not replace them with a figure from a blog.");

  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
