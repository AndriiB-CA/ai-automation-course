/**
 * Ingest all .md and .txt files from ./docs into the pgvector chunks table.
 *
 * Run: npm run ingest
 *
 * This script is idempotent — it won't recreate the extension/table/index
 * if they already exist.  Re-running it will insert duplicate chunks, so
 * clear the table manually if you want a fresh load:
 *   psql $DATABASE_URL -c "DELETE FROM chunks;"
 */
import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { pool, embedBatch, toVectorLiteral } from "./db.js";

// ---------------------------------------------------------------------------
// Schema bootstrap (idempotent)
// ---------------------------------------------------------------------------
async function ensureSchema(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // pgvector extension
    await client.query("CREATE EXTENSION IF NOT EXISTS vector");

    // Chunks table — embedding column is vector(1024) matching Voyage 3.5-lite
    await client.query(`
      CREATE TABLE IF NOT EXISTS chunks (
        id          BIGSERIAL PRIMARY KEY,
        document_id TEXT        NOT NULL,
        content     TEXT        NOT NULL,
        embedding   vector(1024),
        metadata    JSONB,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // HNSW index for fast approximate nearest-neighbour search using cosine
    // distance. pgvector 0.8.0+ also enables faster filtered queries when you
    // add a WHERE clause (e.g. WHERE document_id = $2) alongside the ANN
    // operator — no extra partial index needed for simple equality filters.
    await client.query(`
      CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
        ON chunks
        USING hnsw (embedding vector_cosine_ops)
    `);

    await client.query("COMMIT");
    console.log("Schema ready (extension + table + HNSW index).");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------
const CHUNK_SIZE = 2000;   // ~512 tokens at ~4 chars/token
const CHUNK_OVERLAP = 200; // ~50-token overlap

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);
    chunks.push(text.slice(start, end).trim());
    if (end === text.length) break;
    start = end - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 0);
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
const DOCS_DIR = "./docs";

async function findDocuments(): Promise<string[]> {
  const entries = await fs.readdir(DOCS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && /\.(md|txt)$/i.test(e.name))
    .map((e) => path.join(DOCS_DIR, e.name));
}

// ---------------------------------------------------------------------------
// Insertion
// ---------------------------------------------------------------------------
async function insertChunks(
  rows: Array<{
    document_id: string;
    content: string;
    embedding: number[];
    metadata: Record<string, unknown>;
  }>
): Promise<void> {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    // Use a single multi-row INSERT for efficiency
    const placeholders = rows
      .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}::vector, $${i * 4 + 4})`)
      .join(", ");
    const values = rows.flatMap((r) => [
      r.document_id,
      r.content,
      toVectorLiteral(r.embedding),
      JSON.stringify(r.metadata),
    ]);
    await client.query(
      `INSERT INTO chunks (document_id, content, embedding, metadata) VALUES ${placeholders}`,
      values
    );
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  await ensureSchema();

  const filePaths = await findDocuments();
  if (filePaths.length === 0) {
    console.warn(`No .md or .txt files found in ${DOCS_DIR}. Add some documents and re-run.`);
    return;
  }

  console.log(`Found ${filePaths.length} document(s).`);
  let totalChunks = 0;

  for (const filePath of filePaths) {
    const documentId = path.basename(filePath); // use filename as document ID
    const text = await fs.readFile(filePath, "utf8");
    const chunks = chunkText(text);
    console.log(`  ${documentId}: ${chunks.length} chunk(s)`);

    // Embed all chunks for this document in one batched call
    const embeddings = await embedBatch(chunks);

    const rows = chunks.map((content, i) => ({
      document_id: documentId,
      content,
      embedding: embeddings[i],
      metadata: { file: filePath, chunk_index: i },
    }));

    await insertChunks(rows);
    totalChunks += chunks.length;
  }

  console.log(`Done. Inserted ${totalChunks} chunk(s) across ${filePaths.length} document(s).`);
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
