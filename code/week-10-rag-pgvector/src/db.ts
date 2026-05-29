/**
 * Shared database pool and embedding helpers.
 * Import this from ingest, search, and eval to avoid re-creating clients.
 */
import "dotenv/config";
import pg from "pg";
import VoyageAI from "voyageai";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Postgres pool — reads DATABASE_URL from the environment.
// ---------------------------------------------------------------------------
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---------------------------------------------------------------------------
// Voyage AI client — reads VOYAGE_API_KEY from the environment.
// ---------------------------------------------------------------------------
const voyage = new VoyageAI({ apiKey: process.env.VOYAGE_API_KEY ?? "" });

const EMBEDDING_MODEL = "voyage-3.5-lite";
const EMBEDDING_DIMS = 1024;

/**
 * Embed a single text string.
 * Returns a number[] of length EMBEDDING_DIMS (1024).
 */
export async function embed(text: string): Promise<number[]> {
  const response = await voyage.embed({
    input: [text],
    model: EMBEDDING_MODEL,
  });
  const embedding = response.data?.[0]?.embedding;
  if (!embedding) throw new Error("No embedding returned from Voyage AI");
  return embedding;
}

/**
 * Embed multiple texts in a single API call (more efficient than calling
 * embed() in a loop). Voyage AI supports up to 128 texts per request.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 128; // Voyage AI hard limit per request
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await voyage.embed({ input: batch, model: EMBEDDING_MODEL });
    const embeddings = response.data?.map((d) => d.embedding) ?? [];
    if (embeddings.length !== batch.length) {
      throw new Error(`Voyage returned ${embeddings.length} embeddings for ${batch.length} inputs`);
    }
    results.push(...embeddings);
  }

  return results;
}

/**
 * Convert a number[] embedding to the string format pgvector expects:
 *   '[0.1,0.2,...,0.9]'
 * Pass this string in a parameterized query and cast it: $1::vector
 */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

export { EMBEDDING_DIMS };
