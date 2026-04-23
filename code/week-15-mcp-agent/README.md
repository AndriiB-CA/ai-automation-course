# Week 15 — MCP Server + Multi-Tool Agent

Build this during Weeks 14–15. Full guidance in [module 4](../../modules/04-agents.md).

## What you'll build

1. A custom **MCP server** that exposes 3+ tools (Week 14)
2. A **multi-tool research agent** that uses those tools via MCP (Week 15)

## Part 1 — MCP Server

Recommended: **Test-Run MCP** (aligned with your QA track)

```bash
npm init -y
npm install @modelcontextprotocol/sdk zod
npm install -D tsx typescript @types/node
```

Tools to expose:
- `run_playwright_test(test_file: string) → { passed, stderr, duration_ms }`
- `list_failing_tests(report_path: string) → string[]`
- `get_test_source(test_name: string) → string`

See [MCP TypeScript SDK README](https://github.com/modelcontextprotocol/typescript-sdk) for scaffolding.

## Part 2 — Research Agent

Recommended framework: **Mastra** (TypeScript-first, MCP-native)

```bash
npm install @mastra/core @anthropic-ai/sdk
```

Your agent needs:
- 5 tools (web_search, web_fetch, summarize, save_note, list_notes)
- Persistent memory (SQLite or local JSON)
- Budget cap (stops if cost > $0.50)
- Max iterations cap (default 15)
- Streaming console output with `[think]`, `[act]`, `[observe]` tags

## Wiring MCP → Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "test-runner": {
      "command": "node",
      "args": ["/absolute/path/to/your/server.js"]
    }
  }
}
```

Restart Claude Desktop. Your tools appear in the 🔌 menu.

## Success criteria

- [ ] MCP server starts without errors
- [ ] Claude Desktop lists your tools
- [ ] Agent completes a 500-word research task end-to-end
- [ ] Budget cap fires when deliberately exceeded
- [ ] Langfuse traces show every tool call
