# 🛠️ Tools Cheat Sheet

> A snapshot of the tooling landscape you'll touch in this course. Landscape changes fast — re-evaluate every 3 months.

---

## Essential — set up in Week 1

| Tool | What it is | Cost | When you need it |
|---|---|---|---|
| **Anthropic API** | Claude access | Pay-per-use, ~$20 lasts weeks | From Week 2 onward |
| **OpenAI API** | GPT-4/5 access for comparison | Pay-per-use | Optional but useful |
| **Node.js 20+** | JavaScript runtime | Free | Daily |
| **uv** | Modern Python package manager | Free | Module 3+ |
| **Docker** | Containers | Free | Module 3+ |
| **VS Code + Claude Code ext** | Editor | Free | Daily |
| **GitHub + GitHub Actions** | Repos + CI | Free for public repos | From Week 7 |

---

## LLM SDKs (TypeScript-first)

| SDK | Best for | My take |
|---|---|---|
| `@anthropic-ai/sdk` | Claude direct | Most explicit. Start here. |
| `openai` | GPT direct | Same shape as Anthropic, easy swap |
| `ai` (Vercel AI SDK) | Provider-agnostic, streaming-first | Great for Next.js projects |
| `@mastra/core` | Agent framework | TypeScript-native, MCP-aware, 2026-ready |
| `langchain` | Everything | Heavy, but huge ecosystem if you need it |

**Recommendation for course:** Learn the raw Anthropic SDK first (Modules 1–2). Move to Vercel AI SDK or Mastra when building apps (Modules 3–5).

---

## Eval & testing

| Tool | What it does | Hosted? |
|---|---|---|
| **Promptfoo** | Open-source eval framework, YAML-configured | Local + cloud |
| **Langfuse** | Traces + evals + prompt management | Self-host free / cloud free tier |
| **LangSmith** | LangChain's observability | Cloud (free tier) |
| **Braintrust** | Eval + dataset management | Cloud paid |
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

**Recommendation for course:** Start with pgvector in Docker. If building a deployed app, use Supabase.

---

## Agent frameworks

| Framework | Language | Style | Notes |
|---|---|---|---|
| **Vercel AI SDK** | TS | Low-level, explicit | Start here — teaches you patterns |
| **Mastra** | TS | Medium, MCP-native | Best fit for 2026 TS-first building |
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
| **Stagehand** | LLM-driven wrapper over Playwright | Week 17's starting point |
| **Browser-Use** | Python, LLM-first | Reference reading |
| **Anthropic Computer Use** | Vision + coordinates | When selectors fail entirely |
| **Browserbase** | Hosted, headless, sandboxed | Production scale |

**Recommendation:** Playwright + Stagehand in dev. Move to Browserbase when you need scale or anti-bot resilience.

---

## MCP (Model Context Protocol)

- **[MCP official docs](https://modelcontextprotocol.io/)**
- **[TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)**
- **[Python SDK](https://github.com/modelcontextprotocol/python-sdk)**
- **[Official servers](https://github.com/modelcontextprotocol/servers)** — GitHub, Slack, Postgres, Puppeteer, filesystem, …
- **[Awesome MCP servers](https://github.com/punkpeye/awesome-mcp-servers)** — community catalog

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
# Anthropic CLI — poke at the API from your shell
npm install -g @anthropic-ai/sdk

# Promptfoo — evals as a binary
npm install -g promptfoo

# Claude Code — agent in your terminal
npm install -g @anthropic-ai/claude-code

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

- **[Anthropic cookbook](https://github.com/anthropics/anthropic-cookbook)** — definitive examples
- **[Anthropic API docs](https://docs.claude.com/)** — your daily reference
- **[OpenAI cookbook](https://cookbook.openai.com/)** — GPT patterns
- **[Prompt Engineering Guide](https://www.promptingguide.ai/)** — community knowledge base
- **[RAG Techniques](https://github.com/NirDiamant/RAG_Techniques)** — catalog of RAG approaches

---

## Anti-patterns: tools NOT to spend time on (in 2026)

- Any framework you can't explain to yourself in 3 sentences
- Old LangChain examples from 2023 (API changed heavily)
- Vector DBs that charge per vector (unless at real scale)
- AI "app builders" that don't output code — you can't debug them
- Paid AI tutorials before you've done the free ones
