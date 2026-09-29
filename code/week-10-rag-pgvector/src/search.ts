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
import { pathToFileURL } from "node:url";
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

/**
 * Hybrid search: vector nearest neighbours fused with Postgres full-text rank.
 *
 * Raw cosine similarity and ts_rank are not on the same scale, so this does
 * not multiply them by 0.7 and 0.3. It uses reciprocal rank fusion: each hit
 * contributes 1/(60 + rank) from whichever lists it appears in. Requires the
 * content_tsvector column created by ingest.
 */
export async function hybridSearch(query: string, k = 5): Promise<SearchResult[]> {
  const embedding = await embed(query);
  const vectorLiteral = toVectorLiteral(embedding);

  const result = await pool.query<SearchResult>(
    `WITH vector_ranked AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY dist) AS vrank
       FROM (
         SELECT id, embedding <=> $1::vector AS dist
         FROM chunks
         ORDER BY dist
         LIMIT 50
       ) nearest
     ),
     keyword_ranked AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY kw DESC) AS krank
       FROM (
         SELECT id, ts_rank_cd(content_tsvector, plainto_tsquery('english', $2)) AS kw
         FROM chunks
         WHERE content_tsvector @@ plainto_tsquery('english', $2)
         ORDER BY kw DESC
         LIMIT 50
       ) lexical
     )
     SELECT
       c.id::text,
       c.document_id,
       c.content,
       (
         COALESCE(1.0 / (60 + v.vrank), 0) +
         COALESCE(1.0 / (60 + k.krank), 0)
       )::float AS similarity
     FROM chunks c
     LEFT JOIN vector_ranked v ON v.id = c.id
     LEFT JOIN keyword_ranked k ON k.id = c.id
     WHERE v.id IS NOT NULL OR k.id IS NOT NULL
     ORDER BY similarity DESC
     LIMIT $3`,
    [vectorLiteral, query, k],
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

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
