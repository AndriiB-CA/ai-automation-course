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
npm install openai pg dotenv
npm install -D tsx typescript @types/pg @types/node
```

## Scripts

```bash
npm run explore   # Week 9 — cosine matrix, no Postgres. Writes similarities.csv
npm run ingest    # chunks + embeddings + tsvector column
npm run search -- "your query"
npm run eval      # Recall@5, vector only
npm run compare   # Week 11 — vector vs hybrid (RRF) vs hybrid+rerank
```

`explore` replaces the notebook this folder used to point at. That notebook was never in the repo.

Hybrid search uses reciprocal rank fusion, not a 0.7/0.3 blend of cosine and `ts_rank`. The reranker calls `LLM_MODEL_SMALL`. A hosted reranker can replace `src/rerank.ts` later, after `compare` says it wins.

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
