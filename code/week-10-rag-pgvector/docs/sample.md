# Introduction to Retrieval-Augmented Generation (RAG)

## What is RAG?

Retrieval-Augmented Generation (RAG) is a technique that combines the strengths
of large language models with the precision of information retrieval systems.
Instead of relying solely on knowledge baked into a model's parameters during
training, RAG retrieves relevant documents at query time and injects them into
the prompt as additional context.

This approach solves two common LLM problems:
1. **Knowledge cutoff** — the model may not know about recent events.
2. **Hallucination** — the model may confidently produce incorrect facts.

## How it works

A typical RAG pipeline has three stages:

### 1. Ingestion
Documents are split into chunks (typically 200–1000 tokens each), embedded into
a high-dimensional vector space using an embedding model, and stored in a vector
database alongside the original text.

### 2. Retrieval
When a user asks a question, the question is embedded using the same model.
The vector database performs an approximate nearest-neighbour (ANN) search to
find the most semantically similar chunks.

### 3. Generation
The retrieved chunks are inserted into the LLM prompt as context. The model uses
this grounding information to produce a more accurate, up-to-date answer.

## pgvector

pgvector is a Postgres extension that adds a `vector` data type and distance
operators (`<=>` cosine, `<->` L2, `<#>` inner product). It supports HNSW and
IVFFlat indexes for scalable ANN search inside a familiar SQL environment.

Example query:

```sql
SELECT id, document_id, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM chunks
ORDER BY embedding <=> $1::vector
LIMIT 5;
```

## Embedding models

Voyage AI's `voyage-3.5-lite` model produces 1024-dimensional embeddings
optimised for retrieval tasks. Its small size keeps inference fast and
API costs low, making it a good default for course projects.

## Evaluation

Retrieval quality is commonly measured with **Recall@K**: the fraction of
relevant documents that appear in the top-K results. A Recall@5 ≥ 0.8 is
considered solid for a first-pass RAG system.
