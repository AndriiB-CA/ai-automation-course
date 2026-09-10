# Week 2 — Your First Real API Call

A streaming URL summarizer. Your introduction to:
- The Chat Completions API (the shape every provider speaks)
- System prompts vs user messages
- Streaming with `messages.stream()`
- Cost tracking per call

## Run it

```bash
cd code/week-02-first-api-call
npm install
cp .env.example .env      # fill in LLM_BASE_URL / LLM_API_KEY / LLM_MODEL
npm install

npx tsx summarize.ts https://en.wikipedia.org/wiki/Large_language_model
npx tsx summarize.ts https://example.com --tone=snarky
```

## Things to try after it works

1. Swap `LLM_MODEL` to the smallest model your provider offers — how much does quality drop? Cost?
   Then point `LLM_BASE_URL` at a *different* provider entirely and re-run. Same code, different vendor.
2. Add a `--language=fr` flag that makes the summary French
3. Add a `--bullets=5` flag (configurable bullet count)
4. Add error handling for 404s, paywalls, and non-HTML responses
5. Make it handle multiple URLs: `summarize url1 url2 url3`

## What to notice

- The system prompt is reusable across many inputs — this is what **prompt caching** (Week 22) will make cheap
- The user message contains **data**, clearly tagged with XML. This pattern prevents prompt injection from the page content
- We truncate input to 8K chars — in production you'd chunk and summarize recursively

## 🛡️ Security notes

This tool fetches arbitrary URLs. In production:
- Validate URLs against an allow-list or block internal IPs (SSRF)
- Set fetch timeouts and size caps
- Sandbox the text extraction (jsdom in a worker, not main thread)
