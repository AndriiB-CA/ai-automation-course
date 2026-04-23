# Module 3 — RAG Systems

**Weeks 9–12 · Phase 2: Build · ~24 hours total**

---

## Why this module matters

**Retrieval-Augmented Generation (RAG)** is the #1 production AI pattern in 2026. "Chat with your docs", "semantic search over our Confluence", "support agent that knows our product" — these are all RAG. If you can build, evaluate, and deploy a RAG system, you can ship 80% of the AI features companies need.

## Learning objectives

- Understand embeddings well enough to debug them
- Run Postgres + pgvector locally and in production
- Choose a chunking strategy based on data characteristics
- Measure retrieval quality with `Recall@k` and `MRR`
- Ship a working RAG app to a public URL

---

## Week 9 — Embeddings from Scratch

### Core intuition
An embedding is a function that maps text → a vector of floats (e.g., 1024 numbers) such that **semantically similar texts land near each other** in vector space. "Fixed a memory leak in the login flow" lands near "Resolved memory issue in auth." That proximity is what makes search work.

### Reading (90 min)
- ⭐ Visual: [The Illustrated Transformer — Jay Alammar](https://jalammar.github.io/illustrated-transformer/) (read, not watch)
- [Embeddings — Cohere's explainer](https://cohere.com/blog/what-are-embeddings)
- [Sentence Transformers intro](https://www.sbert.net/)

### Video (20 min)
- 🎥 [What are embeddings? — Cohere](https://www.youtube.com/watch?v=OATCgQtNX2o)

### Weekend project (3 hours)

**Build:** An embedding explorer.
1. Pick 100 texts you care about — Slack messages, tweets, past bug reports, journal entries (local only 🛡️)
2. Embed them using `voyage-3` (Anthropic-recommended) or OpenAI's `text-embedding-3-small`
3. Calculate cosine similarity of each pair → heatmap
4. Run t-SNE or UMAP → plot in 2D → manually label the clusters
5. Try to break it: craft two texts that mean the same thing in different words. Do they land near each other? Craft two that look similar but mean opposite things. Do they land apart?

Starter notebook: `/code/week-10-rag-pgvector/embedding-explorer.ipynb` (Python).

### Debugging embeddings
Things to notice:
- Very short strings ("yes", "no") cluster weirdly
- Language matters (English and French translations can land far apart with some models)
- Negation ("is", "is not") often doesn't change the embedding much — known failure mode!

---

## Week 10 — Vector Databases with pgvector

### Why pgvector over fancy alternatives
Because 90% of teams already have Postgres. You don't need Pinecone, Weaviate, or Qdrant for your first 10M vectors. Keep it boring.

### Reading (90 min)
- [pgvector README](https://github.com/pgvector/pgvector)
- [Supabase's pgvector guide](https://supabase.com/docs/guides/ai/vector-embeddings)
- [IVFFlat vs HNSW indexing](https://tembo.io/blog/vector-indexes-in-pgvector)

### Code along
[`/code/week-10-rag-pgvector/`](../code/week-10-rag-pgvector/) has a complete docker-compose + TypeScript ingestion pipeline.

### Weekend project (4 hours)
1. `docker-compose up` a Postgres with pgvector
2. Design a schema:
   ```sql
   CREATE EXTENSION vector;
   CREATE TABLE chunks (
     id BIGSERIAL PRIMARY KEY,
     document_id TEXT NOT NULL,
     content TEXT NOT NULL,
     embedding vector(1024),
     metadata JSONB,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
   ```
3. Ingest 500 real documents (your past blog posts, your company's public docs, a subreddit export, a GitHub repo's issues)
4. Write a query function: `semanticSearch(query: string, k: number) → Chunk[]`
5. Build a CLI: `search "how do I reset my password?"` → returns top 5 chunks with similarity scores

### 🧪 QA bridge
Write an eval for your search function. Given 10 queries with known-good expected documents, measure `Recall@5`: of the expected documents, how many appear in the top 5? This is **search testing** — same mindset as functional testing, just with probabilistic oracles.

---

## Week 11 — Chunking + Retrieval Strategies

### The core tension
- **Big chunks** → more context per hit, but dilute signal, hit token limits
- **Small chunks** → precise matches, but may lose surrounding context
- **Semantic chunks** → better coherence, but expensive to compute
- **Fixed chunks** → simple, reproducible, fine for most cases

### Reading (2 hours)
- [Chunking Strategies — Pinecone](https://www.pinecone.io/learn/chunking-strategies/)
- [Advanced RAG techniques — IBM](https://www.ibm.com/think/topics/retrieval-augmented-generation)
- [Hybrid search explained — Weaviate](https://weaviate.io/blog/hybrid-search-explained)
- ⭐ [The RAG Triad — TruLens](https://www.trulens.org/trulens_eval/core_concepts_rag_triad/) — **THE** framework for evaluating RAG quality

### Video (40 min)
- 🎥 [Advanced RAG Techniques — James Briggs](https://www.youtube.com/watch?v=ea2W8IogX80)

### Weekend project (4 hours)

Take your Week 10 setup. Implement **three chunking strategies**:
1. **Fixed-size** — 512 tokens per chunk, 50-token overlap
2. **Recursive** — split on `\n\n`, then `\n`, then sentence, falling back to fixed size
3. **Semantic** — split when adjacent-sentence embeddings differ above a threshold (use `langchain`'s `SemanticChunker` or roll your own)

For each strategy:
- Ingest the same 500 documents
- Run 20 queries (curate these manually, know the expected answer)
- Measure: `Precision@5`, `Recall@5`, `MRR`
- Record token cost per query (retrieval + generation)
- Record p95 latency

Deliverable: a markdown report with a table of results + a recommendation for your dataset.

### Bonus: Hybrid search
Most production systems combine vector search with BM25 (keyword). In Postgres, add:
```sql
ALTER TABLE chunks ADD COLUMN content_tsvector tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX ON chunks USING GIN(content_tsvector);
```
Then blend scores: `final_score = 0.7 * vector_score + 0.3 * bm25_score`. Measure again.

---

## Week 12 — Ship a RAG App

### The goal
A real URL you can share. Even if only you use it. Shipping forces you to confront:
- Auth (who can query?)
- Rate limiting (how much will one user cost you?)
- Observability (what's happening in prod?)
- UX (how do you show sources? handle "no good answer"?)

### Suggested stack
- **Frontend:** Next.js 15 (App Router)
- **LLM orchestration:** Vercel AI SDK
- **Embeddings:** Voyage AI or OpenAI
- **DB:** Supabase (Postgres + pgvector, free tier)
- **Deploy:** Vercel (free tier)
- **Observability:** Langfuse Cloud (free 50k events/mo)

### Reading (90 min)
- [Vercel AI SDK — RAG Guide](https://sdk.vercel.ai/docs/guides/rag-chatbot)
- [Next.js 15 streaming patterns](https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming)

### Weekend project (5+ hours — this is the capstone of Phase 2)

**Build and deploy:** A RAG chatbot over something **you** care about.

Dataset ideas:
- Your personal blog posts or Notion
- Your company's public-facing docs
- A favorite open-source project's issues + discussions
- A podcast's transcripts
- Your past code PRs (and their descriptions)

**Required features:**
- [ ] Streaming responses
- [ ] Citations — show which source chunks were used
- [ ] "I don't know" handling when retrieval quality is low
- [ ] Conversation history in state
- [ ] Deployed to a public URL
- [ ] Rate limit per IP (simple is fine — e.g., 20/hour)
- [ ] Connected to Langfuse for tracing
- [ ] A `/evals` page or GitHub Action running the RAG Triad:
  - **Context relevance**: did we retrieve the right stuff?
  - **Groundedness**: did the answer stick to the sources?
  - **Answer relevance**: did the answer address the question?

🎯 **Portfolio moment:** This is your first deployable AI artifact. Tweet about it. LinkedIn-post about it. You built a real thing.

### 🛡️ Security callout
- Scrub secrets from your docs *before* embedding them
- What if a user asks about someone else's private data? Hard access control at the query layer, not the prompt
- Log every query (but redact PII)
- Never let the LLM see your API keys even in error messages

---

## Self-check before moving on

- [ ] You have a public URL for your RAG app
- [ ] You can explain the RAG Triad in one minute
- [ ] You have measurements of retrieval quality for at least two chunking strategies
- [ ] You've logged a real query to Langfuse and seen the full trace
- [ ] You know the cost per query of your app within 20%

---

## Daily 15-min tasks

- **Mon:** Query your RAG app with a weird edge case. Does it fail gracefully?
- **Tue:** Read one post from [Ethan Mollick's Substack](https://www.oneusefulthing.org/) — stay tuned to real-world AI adoption
- **Wed:** Add one test case to your RAG eval suite
- **Thu:** Browse one new technique in [RAG Techniques repo](https://github.com/NirDiamant/RAG_Techniques) — pick one to try next weekend
- **Fri:** Look at your Langfuse dashboard — which query was most expensive this week? Why?

---

## Where you are now

You've gone from zero to a deployed AI product in 12 weeks. Pause and appreciate this — most people never get here. Take a photo of your deployed RAG app on your phone, save it somewhere you'll see in a year.

---

## ⏭️ Next up
**[Module 4 — Agents & MCP](./04-agents.md)** — Weeks 13–16. Multi-step reasoning, tool use at scale, and the open protocol reshaping the AI tooling landscape.
