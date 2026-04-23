# Week 10 — RAG with pgvector

Build this during your Week 10 weekend session. Full guidance in [module 3](../../modules/03-rag.md).

## What you'll build

A local vector search system: Docker Postgres + pgvector, TypeScript ingestion, semantic search CLI.

## Setup (follow the module)

```bash
# 1. Start Postgres with pgvector
docker run -d --name pgvector-demo \
  -e POSTGRES_PASSWORD=dev \
  -p 5432:5432 \
  pgvector/pgvector:pg16

# 2. Initialize schema
psql postgresql://postgres:dev@localhost:5432/postgres <<'SQL'
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE chunks (
  id BIGSERIAL PRIMARY KEY,
  document_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1024),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
SQL

# 3. Install deps
npm init -y
npm install @anthropic-ai/sdk pg voyageai dotenv
npm install -D tsx typescript @types/pg @types/node
```

## Files you'll create here

- `ingest.ts` — read docs, chunk, embed, insert
- `search.ts` — take query, embed, SELECT ... ORDER BY embedding <=> $1 LIMIT k
- `eval.ts` — measure Recall@5 on labeled queries
- `docker-compose.yml` — reproducible Postgres + pgvector

## Reference queries

```sql
-- Top-5 most similar chunks to a query embedding
SELECT id, document_id, content,
       1 - (embedding <=> $1) AS similarity
FROM chunks
ORDER BY embedding <=> $1
LIMIT 5;
```

## Success criteria

- [ ] 500 documents ingested
- [ ] semanticSearch(q, k) returns in <100ms
- [ ] Recall@5 measured on 20 labeled queries
- [ ] Results written up in a `RESULTS.md`
