/**
 * Shared database pool and embedding helpers.
 * Import this from ingest, search, and eval to avoid re-creating clients.
 *
 * Embeddings get their OWN provider config, separate from chat. That isn't
 * fussiness: the `/embeddings` endpoint is less widely implemented than
 * `/chat/completions`, so several good chat providers (xAI, Groq) can't serve
 * embeddings at all. Mixing — Groq for chat, Ollama or OpenAI for embeddings —
 * is normal. See PROVIDERS.md.
 */
import "dotenv/config";
import OpenAI from "openai";
import pg from "pg";

const { Pool } = pg;

// ---------------------------------------------------------------------------
// Postgres pool — reads DATABASE_URL from the environment.
// ---------------------------------------------------------------------------
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ---------------------------------------------------------------------------
// Embedding client
// ---------------------------------------------------------------------------
function required(name: string, hint: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. ${hint}`);
  return value;
}

const EMBEDDING_MODEL = required(
  "EMBEDDING_MODEL",
  "Set it to an embedding model your provider serves — see PROVIDERS.md.",
);

/**
 * Vector width, which the database column type depends on. Every embedding
 * model has its own; getting it wrong produces a pgvector dimension error on
 * insert rather than silently bad results, which is the good outcome.
 *
 * Check your provider's docs for the model you chose. If you switch models you
 * must re-create the table and re-ingest — the old vectors are the wrong shape
 * AND from a different vector space, so they are not comparable anyway.
 */
export const EMBEDDING_DIMS = Number(
  required("EMBEDDING_DIMS", "Set it to your embedding model's output dimension."),
);

const embeddings = new OpenAI({
  baseURL: process.env.EMBEDDING_BASE_URL || process.env.LLM_BASE_URL,
  apiKey: process.env.EMBEDDING_API_KEY || process.env.LLM_API_KEY || "not-needed",
});

/**
 * Embed a single text string.
 * Returns a number[] of length EMBEDDING_DIMS.
 */
export async function embed(text: string): Promise<number[]> {
  const [only] = await embedBatch([text]);
  if (!only) throw new Error("No embedding returned");
  return only;
}

/**
 * Embed multiple texts per API call — much faster than looping embed().
 *
 * The batch size is conservative on purpose: providers cap requests by both
 * item count and total tokens, and the limits differ. 96 is small enough to be
 * safe everywhere; raise it once you know your provider's ceiling.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const BATCH_SIZE = 96;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const response = await embeddings.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
    });

    // Providers are not required to return items in request order — the index
    // field is authoritative. Sorting by it costs nothing and prevents a
    // corruption bug that would be near-impossible to spot later.
    const ordered = [...response.data].sort((a, b) => a.index - b.index);
    const vectors = ordered.map((d) => d.embedding);

    if (vectors.length !== batch.length) {
      throw new Error(`Provider returned ${vectors.length} embeddings for ${batch.length} inputs`);
    }
    for (const v of vectors) {
      if (v.length !== EMBEDDING_DIMS) {
        throw new Error(
          `Embedding width ${v.length} != EMBEDDING_DIMS ${EMBEDDING_DIMS}. ` +
            `Fix EMBEDDING_DIMS in .env, then drop and re-create the chunks table.`,
        );
      }
    }
    results.push(...vectors);
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

export { EMBEDDING_MODEL };
