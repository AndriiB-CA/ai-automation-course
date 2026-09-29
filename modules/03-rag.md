# Module 3 — RAG Systems

**Weeks 9–12 · Phase 2: Build · ~24 hours total**

---

## Why this module matters

**Retrieval is the grounding layer inside an agent.** "Chat with your docs" is still how a lot of teams start, and you will build one, because bad chunks, bad recall, and a stale index are the same failures an agent hits when search is a tool. The shape people ship now is usually that agent: it decides when to retrieve, blends keyword and vector search, reranks, and cites. Long context does not replace retrieval. It changes how much retrieved text you can hand over. If you can measure retrieval and put it behind a tool, you can ground most of the AI features a team actually asks for.

### Sidebar — "But the context window is 1M tokens now. Why not just paste everything in?"

You will get this question in every architecture discussion from now on, so have the math ready. Flagship models across every vendor now take 1M tokens of input or more. Three reasons "just paste the corpus" still loses for repeated queries:

1. **Cost, per request, forever.** The ratio is what matters, and it barely moves between vendors: sending 1M tokens costs **500× more than sending the 2K that were actually relevant**, every single request, multiplied by your query volume. Do it with your own numbers — take `LLM_PRICE_IN_PER_MTOK` from your `.env`; that figure *is* the price of one full-corpus request. (Prompt caching narrows the gap for a *fixed* corpus re-queried within the cache window, since cached reads run around 10% of list price. That still leaves retrieval ~50× cheaper, the discount resets whenever the corpus changes, and caching is a provider-native feature your compatibility layer may not expose at all.)
2. **Latency.** The model must ingest every token before the first output token. Million-token prompts mean tens of seconds of time-to-first-token; a 2K-token retrieved prompt streams almost immediately.
3. **Attention quality.** Models attend less reliably to material buried in the middle of an enormous prompt. Relevant-only context doesn't just cost less — it *answers better*, which your Week 11 evals can demonstrate.

**When long context genuinely wins:** one-shot analysis of a document that fits (a contract, a codebase slice, a deposition transcript), cross-document reasoning where you can't know what's relevant in advance, or corpora too small to be worth an indexing pipeline. Long context and RAG are complements: retrieval gets the right material *into* the window; the big window lets you be generous about how much "right material" you include.

> 🧪 **QA bridge:** this sidebar is a performance-budget argument, and you can defend it with data — measure cost and time-to-first-token for the same question asked over (a) the full corpus in-context and (b) top-5 retrieved chunks, and put both numbers in your Week 12 writeup.

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
2. Embed them with whatever embedding model your provider serves — check the [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) for current accuracy/cost tradeoffs, and note that **embeddings are a separate endpoint from chat** and not every chat provider offers one. Ollama runs good open-weight embedding models locally for free, which is often the easiest answer here. Set `EMBEDDING_BASE_URL` / `EMBEDDING_MODEL` / `EMBEDDING_DIMS` — see [PROVIDERS.md](../PROVIDERS.md)
3. Calculate cosine similarity of each pair → heatmap
4. Run t-SNE or UMAP → plot in 2D → manually label the clusters
5. Try to break it: craft two texts that mean the same thing in different words. Do they land near each other? Craft two that look similar but mean opposite things. Do they land apart?

Starter: [`/code/week-10-rag-pgvector`](../code/week-10-rag-pgvector/) — `npm run explore` embeds a fixed corpus and writes `similarities.csv`. Plot it if you want a picture; the script is the assignment. There is no notebook in that folder.

### Debugging embeddings
Things to notice:
- Very short strings ("yes", "no") cluster weirdly
- Language matters (English and French translations can land far apart with some models)
- Negation ("is", "is not") often doesn't change the embedding much — known failure mode!

### Choosing dimensions (why the schema says 1024)

Embedding size is a knob, not a constant. More dimensions capture finer semantic distinctions; every dimension also costs storage, index memory, and query latency — *per chunk, forever*. The working ranges in 2026:

| Dimensions | Typical use |
|---|---|
| 256–512 | High-volume, latency-sensitive search; noticeably cheaper indexes; small accuracy drop |
| **1024** | **A common production width** — Week 10's schema uses `vector(1024)` only when you set `EMBEDDING_DIMS=1024`. Match the column to your model, not to this table. |
| 1536–3072 | Marginal recall gains; index size and query cost grow linearly — justify with a benchmark, not a hunch |

Two practical notes:

1. **Modern APIs let you truncate.** Matryoshka-trained models (including Voyage and OpenAI's `text-embedding-3` family) pack the most important information into the leading dimensions, so you can request 512-dim vectors from a 2048-dim model and keep most of the quality. If storage or latency bites at scale, truncation is the first lever — cheaper than switching models.
2. **The dimension is frozen into your index.** Changing it later means re-embedding the entire corpus — a full re-index, not a migration. Pick with a small benchmark on *your* data (your Recall@5 eval below is exactly the tool), then commit.

> 🧪 **QA bridge:** Dimensions vs. recall is a classic cost/quality tradeoff curve — benchmark it like you'd benchmark test-suite depth vs. runtime. Run your Recall@5 eval at 512 and 1024 dims on the same corpus; if the delta is under a point, the smaller index wins.

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
   -- pgvector 0.8.0+ (April 2025): 5.7× faster filtered queries via iterative index scanning
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

Take your Week 10 setup. The measurement that matters is three retrieval stacks on the **same** 20 queries, not chunking alone.

**Chunking** — ingest the same documents three ways:
1. **Fixed-size** — 512 tokens per chunk, 50-token overlap
2. **Recursive** — split on `\n\n`, then `\n`, then sentence, falling back to fixed size
3. **Semantic** — split when adjacent-sentence embeddings differ above a threshold (roll your own, or a library you can explain)

**Retrieval** — for the chunking strategy you keep, measure `Recall@5` three ways. The starter does this in [`code/week-10-rag-pgvector`](../code/week-10-rag-pgvector/) with `npm run compare`:
1. **Vector only** — `semanticSearch`
2. **Hybrid** — vector neighbours fused with Postgres full-text search
3. **Hybrid + rerank** — the hybrid list, reordered by `LLM_MODEL_SMALL`

Also record `Precision@5`, `MRR`, token cost, and p95 latency for the stack you ship.

Deliverable: a markdown report with both tables and a recommendation for *your* dataset. Write the delta you measured. Do not paste a recall lift from a blog post.

### Hybrid search and a reranker

Keyword match and vector similarity fail on different queries. Exact error strings, IDs, and function names favor full text. Paraphrase favors vectors. Production retrieval runs both.

`ingest` adds a generated `tsvector` column and a GIN index. Do not blend cosine similarity with `ts_rank` by a fixed 0.7/0.3. Those numbers are not on the same scale. The starter uses **reciprocal rank fusion**: a hit in a list contributes `1 / (60 + rank)`, summed across the lists it appears in.

Then rerank. A hosted reranker is the usual production upgrade — cheaper and trained for this one job. The portable exercise uses `LLM_MODEL_SMALL` so it runs on the provider you already configured. Put that call behind one function (`src/rerank.ts`) so you can swap in a dedicated endpoint after you have a number that says it wins.

```sql
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS content_tsvector tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;
CREATE INDEX IF NOT EXISTS chunks_content_tsv_idx ON chunks USING GIN (content_tsvector);
```

### Advanced: GraphRAG
For document corpora with complex entity relationships (e.g., legal docs, codebases, research papers), consider **GraphRAG** (open-sourced by Microsoft): it extracts entity-relationship graphs and builds community summaries for multi-hop reasoning. Overkill for simple Q&A, powerful for "who approved X and why?" queries. [GraphRAG docs](https://microsoft.github.io/graphrag/).

### The data lifecycle — what actually breaks in production

Every tutorial (including this one, so far) indexes a corpus once and queries it forever. Real corpora *change*: docs get edited, deleted, and added daily. A RAG system with no update strategy quietly rots — and "the bot confidently answered from a policy we deleted in March" is the RAG incident you'll actually get paged for.

Three problems, three patterns:

1. **Detecting change.** Store a content hash (and source `updated_at` if the system provides one) per document. On each sync run, diff hashes: new → index, changed → re-chunk and replace, missing → delete. Never "just re-index everything" on a schedule — at 100K+ documents that's slow, expensive, and causes a window where search quality dips mid-rebuild.

2. **Replacing safely.** A changed document's chunk boundaries shift, so you can't update chunks in place — delete *all* chunks for that `document_id` and insert the new set, in one transaction. This is why every chunk row needs a `document_id` foreign key from day one (your Week 10 schema should already have it — check).

3. **Proving deletion worked.** Deleted content hiding in the index is both a quality bug and a **compliance bug** (GDPR erasure, retracted policies, offboarded customer data). Keep a small **staleness eval**: for each recently deleted document, ask a question only it could answer and assert the bot *doesn't* reproduce the deleted content. Run it in CI next to your retrieval evals.

> 🧪 **QA bridge:** This is regression testing for your index. The staleness suite is a negative-assertion test ("must NOT find X") — you've written hundreds of those. And the sync job needs the same idempotency discipline as any data migration: running it twice must be safe.

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
- **Embeddings:** whatever you set in `EMBEDDING_*` — a chat provider often does not serve them. See [PROVIDERS.md](../PROVIDERS.md)
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
- [ ] You have Recall@5 for vector, hybrid, and hybrid+rerank on the same queries, plus at least two chunking strategies
- [ ] You've logged a real query to Langfuse and seen the full trace
- [ ] You know the cost per query of your app within 20%
- [ ] You can sketch the index update strategy: hash-diff sync, transactional chunk replacement, staleness evals

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
