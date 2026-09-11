# 🛠️ Tools Cheat Sheet

> A snapshot of the tooling landscape you'll touch in this course. Landscape changes fast — re-evaluate every 3 months.

---

## Essential — set up in Week 1

| Tool | What it is | Cost | When you need it |
|---|---|---|---|
| **An LLM provider** | Any OpenAI-compatible endpoint — see [PROVIDERS.md](../PROVIDERS.md) | Free tier (Groq, Google) or ~$20 lasts weeks | From Week 2 onward |
| **A second provider** | For eval comparisons — a free tier is enough | Free | From Week 7 |
| **Node.js 20+** | JavaScript runtime | Free | Daily |
| **uv** | Modern Python package manager | Free | Module 3+ |
| **Docker** | Containers | Free | Module 3+ |
| **VS Code + an AI coding agent** | Editor — see [Module 16](../modules/16-ai-coding-agents.md) | Free tier available | Daily |
| **GitHub + GitHub Actions** | Repos + CI | Free for public repos | From Week 7 |

---

## LLM SDKs (TypeScript-first)

| SDK | Best for | My take |
|---|---|---|
| `openai` | **Any** OpenAI-compatible provider via `baseURL` | What this course uses. One dependency, every vendor. |
| Vendor-native SDKs (`@anthropic-ai/sdk`, `@google/genai`, …) | That vendor's newest features first | Prompt caching, native structured outputs, reasoning controls. Reach for one deliberately, behind a single function. |
| `ai` (Vercel AI SDK) | Provider-agnostic with typed provider adapters | Nicer abstractions than raw compat; great for Next.js |
| `@mastra/core` | Agent framework | TypeScript-native, MCP-aware, 2026-ready |
| `langchain` | Everything | Heavy, but huge ecosystem if you need it |

**Recommendation for course:** the `openai` SDK pointed at whichever provider you chose (Modules 1–2). Move to the Vercel AI SDK or Mastra when building apps (Modules 3–5).

**On compatibility:** "OpenAI-compatible" means the request *shape* matches, not that every field is honoured. `tools` is portable; `response_format`, `strict`, `seed` and reasoning controls are not. The matrix in [PROVIDERS.md](../PROVIDERS.md) says which is which.

---

## Eval & testing

| Tool | What it does | Hosted? |
|---|---|---|
| **Promptfoo** | Open-source eval framework, YAML-configured | Local + cloud |
| **Langfuse** | Traces + evals + prompt management | Self-host free / cloud free tier |
| **LangSmith** | LangChain's observability | Cloud (free tier) |
| **Braintrust** | All-in-one eval + dataset + tracing, CI-gated | Cloud paid |
| **DeepEval** | Pytest-style eval framework, strong RAGAS integration | Python (local) |
| **Arize Phoenix** | OSS LLM observability | Self-host free |
| **TruLens** | RAG-focused evals | OSS |

**Recommendation:** Promptfoo for eval authoring + Langfuse for runtime tracing. Both are free forever for solo builders.

---

## Vector databases

| Option | When to pick it |
|---|---|
| **pgvector** (Postgres) | 90% of cases, especially if you have Postgres already |
| **Supabase** | Hosted pgvector with auth + storage, free tier generous |
| **Qdrant** | If you need better filtering + production-grade single-service |
| **Pinecone** | If you need very large scale (>10M vectors) and managed |
| **Weaviate** | Great hybrid search, multi-modal |
| **Chroma** | Simplest for local prototyping |

**Recommendation for course:** Start with pgvector in Docker (0.8.0+ gives ~5.7× faster filtered queries via iterative index scanning). If building a deployed app, use Supabase. In 2026, **hybrid search (vector + BM25) is the production default**, not a bonus.

---

## Embedding models

| Model | Notes |
|---|---|
| **OpenAI `text-embedding-3-*`** | The widely-available default; served by the compat endpoint |
| **Voyage** | Consistently near the top of MTEB for accuracy/cost |
| **Cohere embed v3** | Strong multilingual + native reranking pairing |
| **Open-weight via Ollama** | Free, local, private. Good enough for most retrieval, and the only option if your data can't leave the building |

**Recommendation:** check the [MTEB leaderboard](https://huggingface.co/spaces/mteb/leaderboard) rather than trusting any list's ranking — this one included, it ages fast.

⚠️ **Embeddings are a separate endpoint from chat, and less widely served.** Several good chat providers (xAI, Groq) don't offer them at all, so mixing vendors here is normal — that's why Module 3 uses its own `EMBEDDING_*` variables. And every model has its own vector width and its own vector space: changing models means re-creating the column and re-ingesting, never a partial migration.

---

## Agent frameworks

| Framework | Language | Style | Notes |
|---|---|---|---|
| **Vercel AI SDK** | TS | Low-level, explicit | Start here — teaches you patterns |
| **Mastra v1.0** | TS | Medium, MCP-native | Best fit for 2026 TS-first building (used by PayPal/Adobe/Docker) |
| **OpenAI Agents SDK** | TS / Python | Provider-agnostic | Handoffs, guardrails, tracing built in — accepts any compatible base URL |
| **Vendor-native agent SDKs** | TS / Python | Single-vendor | Newest agent features first, orchestration-layer lock-in in exchange |
| **LangGraph.js** | TS | Higher-level, graph-based | Powerful but steep learning |
| **LangChain.js** | TS | Batteries-included | Massive but opinionated |
| **CrewAI** | Python | Multi-agent roles | Python-only, good for multi-agent exploration |
| **AutoGen** | Python (Microsoft) | Conversational agents | Research-feel |

**Recommendation:** Vercel AI SDK for Week 4. Mastra when you're building a real agent in Week 15.

---

## Browser automation

| Tool | Approach | Best for |
|---|---|---|
| **Playwright** (raw) | Selectors + API | Your existing superpower |
| **Playwright Agents** | NL test-gen + self-healing built into Playwright (v1.56+) | If you already use Playwright, start here |
| **Stagehand** | LLM-driven wrapper over Playwright | Week 17's starting point |
| **Browser-Use** | Python, LLM-first | Reference reading |
| **Computer-use agents** | Vision + OS-level coordinates | When there is no DOM at all — desktop apps, Citrix, legacy ERP |
| **Browserbase** | Hosted, headless, sandboxed | Production scale |

**Recommendation:** Playwright + Stagehand in dev. Move to Browserbase when you need scale or anti-bot resilience.

---

## MCP (Model Context Protocol)

- **[MCP official docs](https://modelcontextprotocol.io/)**
- **[TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)**
- **[Python SDK](https://github.com/modelcontextprotocol/python-sdk)**
- **[Official servers](https://github.com/modelcontextprotocol/servers)** — GitHub, Slack, Postgres, Puppeteer, filesystem, …
- **[Awesome MCP servers](https://github.com/punkpeye/awesome-mcp-servers)** — community catalog

> **2026 status:** MCP is now an industry standard — the spec was donated to the Linux Foundation (Dec 2025), and OpenAI, Google, and Microsoft all ship MCP support. Teach it as the default integration layer, not an experiment.

---

## Workflow automation (the no-code glue layer)

| Tool | What it is | When to use |
|---|---|---|
| **n8n** | Self-hostable, code-extensible workflow automation | Connect AI pipelines to Slack/Jira/Sheets/CI without hand-writing integrations (Module 10) |
| **Temporal / Inngest** | Durable, fault-tolerant workflow execution in code | The step up from n8n when you need code-grade reliability + retries |
| **Zapier / Make** | Hosted no-code automation | Quick personal automations; avoid for anything touching secrets or code |

**Recommendation:** Self-host **n8n** for anything that touches your code, test runners, or credentials. Reach for a code agent (not n8n) the moment the LLM needs to decide what to do next.

---

## Deployment

| Platform | Strength | Free tier |
|---|---|---|
| **Vercel** | Next.js apps, preview deploys | Yes, generous |
| **Netlify** | Static + functions | Yes |
| **Railway** | Full-stack + databases | Some trial credits |
| **Fly.io** | Docker anywhere | Yes with credit card |
| **Cloudflare Workers + Workers AI** | Edge LLMs | Yes |
| **Render** | Simple services + Postgres | Yes |
| **Hugging Face Spaces** | Quick demos with Gradio/Streamlit | Yes |

**Recommendation for capstone:** Vercel for the web UI, a Railway/Fly backend for your eval service.

---

## CLI helpers worth installing

```bash
# Promptfoo — evals as a binary
npm install -g promptfoo

# An AI coding agent in your terminal — pick one (Module 16)
npm install -g @anthropic-ai/claude-code    # or @openai/codex, or use Cursor/Windsurf

# Ollama — run models locally, free and offline
curl -fsSL https://ollama.com/install.sh | sh

# uv — faster pip
curl -LsSf https://astral.sh/uv/install.sh | sh

# jq + yq — essential for reading API output / yaml configs
brew install jq yq
```

---

## Security / Red teaming

| Tool | What it does |
|---|---|
| [PyRIT (Microsoft)](https://github.com/Azure/PyRIT) | Generative AI red-team framework |
| [Garak (NVIDIA)](https://github.com/leondz/garak) | LLM vulnerability scanner |
| [Rebuff](https://github.com/protectai/rebuff) | Prompt injection detector |
| [Lakera Guard](https://www.lakera.ai/) | Hosted injection/PII filter |
| [promptfoo red team](https://www.promptfoo.dev/docs/red-team/) | Built-in adversarial evals |

---

## Reference + learning

- **Your provider's own docs** — your daily reference, and the only copy that stays current
- **[OpenAI cookbook](https://cookbook.openai.com/)** — patterns for the API shape this course uses
- **[Anthropic cookbook](https://github.com/anthropics/anthropic-cookbook)** — excellent examples; the prompting craft transfers even if the SDK calls don't
- **[Google Gemini cookbook](https://github.com/google-gemini/cookbook)** — same idea, third perspective
- **[Prompt Engineering Guide](https://www.promptingguide.ai/)** — community knowledge base
- **[RAG Techniques](https://github.com/NirDiamant/RAG_Techniques)** — catalog of RAG approaches

---

## Anti-patterns: tools NOT to spend time on (in 2026)

- Any framework you can't explain to yourself in 3 sentences
- Old LangChain examples from 2023 (API changed heavily)
- Vector DBs that charge per vector (unless at real scale)
- AI "app builders" that don't output code — you can't debug them
- Paid AI tutorials before you've done the free ones
