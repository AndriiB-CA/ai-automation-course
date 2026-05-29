/**
 * Semantic search CLI and reusable helper.
 *
 * CLI usage:
 *   npm run search -- "your query here"
 *   npm run search -- "your query here" 10     # return top-10 instead of 5
 *
 * Programmatic usage:
 *   import { semanticSearch } from "./search.js";
 *   const results = await semanticSearch("What is RAG?", 5);
 */
import "dotenv/config";
import { pool, embed, toVectorLiteral } from "./db.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SearchResult {
  id: string;
  document_id: string;
  content: string;
  similarity: number;
}

// ---------------------------------------------------------------------------
// Core search function (reusable from eval.ts and other modules)
// ---------------------------------------------------------------------------
export async function semanticSearch(query: string, k = 5): Promise<SearchResult[]> {
  const embedding = await embed(query);
  const vectorLiteral = toVectorLiteral(embedding);

  // The <=> operator is pgvector's cosine distance (0 = identical, 2 = opposite).
  // We convert to similarity: 1 - distance, so higher = more similar.
  const result = await pool.query<SearchResult>(
    `SELECT
       id::text,
       document_id,
       content,
       (1 - (embedding <=> $1::vector))::float AS similarity
     FROM chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorLiteral, k]
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// CLI entrypoint
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: npm run search -- \"<query>\" [k]");
    process.exit(1);
  }

  const query = args[0];
  const k = args[1] ? parseInt(args[1], 10) : 5;

  console.log(`\nSearching for: "${query}" (top ${k})\n`);
  console.time("search");

  const results = await semanticSearch(query, k);

  console.timeEnd("search");
  console.log("");

  if (results.length === 0) {
    console.log("No results found. Have you run `npm run ingest` yet?");
  } else {
    results.forEach((r, i) => {
      console.log(`--- Result ${i + 1} (similarity: ${r.similarity.toFixed(4)}) ---`);
      console.log(`Document: ${r.document_id}  ID: ${r.id}`);
      // Print up to 300 chars so the terminal stays readable
      console.log(r.content.slice(0, 300).replace(/\n/g, " ") + (r.content.length > 300 ? "…" : ""));
      console.log("");
    });
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
