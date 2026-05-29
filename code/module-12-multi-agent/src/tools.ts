import https from "node:https";
import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";

// ── In-memory note store ──────────────────────────────────────────────────────

const notes: Array<{ title: string; content: string }> = [];

export function getNotes(): Array<{ title: string; content: string }> {
  return notes;
}

// ── Zod schemas for each tool's input ────────────────────────────────────────

export const WebSearchInput = z.object({
  query: z.string().min(1).max(500),
});

export const WebFetchInput = z.object({
  url: z.string().url(),
});

export const SaveNoteInput = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

// ── Tool handler implementations ──────────────────────────────────────────────

export async function handleWebSearch(raw: unknown): Promise<string> {
  const { query } = WebSearchInput.parse(raw);
  // Mock implementation returns plausible-looking fake results
  const results = [
    {
      title: `Best Practices: ${query}`,
      url: `https://docs.example.com/best-practices`,
      snippet: `A comprehensive guide covering the most important patterns for ${query}, including strategies to avoid common pitfalls and improve reliability.`,
    },
    {
      title: `${query} — Official Documentation`,
      url: `https://playwright.dev/docs/best-practices`,
      snippet: `The official documentation recommends using page object models, auto-waiting, and avoiding hard-coded timeouts when dealing with ${query}.`,
    },
    {
      title: `Community guide to ${query}`,
      url: `https://testing-library.example.com/guides`,
      snippet: `Community contributors share lessons learned from large test suites, emphasising deterministic selectors and network isolation for ${query}.`,
    },
  ];
  return (
    `Search results for "${query}":\n\n` +
    results.map((r) => `[${r.title}](${r.url})\n${r.snippet}`).join("\n\n---\n\n")
  );
}

export async function handleWebFetch(raw: unknown): Promise<string> {
  const { url } = WebFetchInput.parse(raw);
  return new Promise((resolve) => {
    const req = https.get(
      url,
      { headers: { "User-Agent": "module-12-multi-agent/0.1" } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 400) {
            resolve(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            return;
          }
          const html = Buffer.concat(chunks).toString("utf8");
          const text = html
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s{2,}/g, " ")
            .trim();
          const truncated =
            text.length > 8_000 ? text.slice(0, 8_000) + "\n…[truncated]" : text;
          resolve(truncated);
        });
      }
    );
    req.on("error", (err: Error) => resolve(`fetch error: ${err.message}`));
    req.setTimeout(10_000, () => {
      req.destroy();
      resolve("fetch error: timeout after 10s");
    });
  });
}

export function handleSaveNote(raw: unknown): string {
  const { title, content } = SaveNoteInput.parse(raw);
  notes.push({ title, content });
  return `Note "${title}" saved (${notes.length} total notes in memory).`;
}

// ── Anthropic tool definitions ────────────────────────────────────────────────

export const TOOL_DEFINITIONS: Record<string, Anthropic.Tool> = {
  web_search: {
    name: "web_search",
    description: "Search the web for information on a topic. Returns mock results.",
    input_schema: {
      type: "object" as const,
      required: ["query"],
      properties: {
        query: { type: "string", description: "The search query." },
      },
    },
  },
  web_fetch: {
    name: "web_fetch",
    description: "Fetch the text content of a URL.",
    input_schema: {
      type: "object" as const,
      required: ["url"],
      properties: {
        url: { type: "string", description: "Fully-qualified URL to fetch." },
      },
    },
  },
  save_note: {
    name: "save_note",
    description: "Save a note (title + content) to the in-memory notes store.",
    input_schema: {
      type: "object" as const,
      required: ["title", "content"],
      properties: {
        title: { type: "string", description: "Short title for the note." },
        content: { type: "string", description: "Full markdown content of the note." },
      },
    },
  },
};

export type ToolName = keyof typeof TOOL_DEFINITIONS;

export async function dispatchTool(name: ToolName, input: unknown): Promise<string> {
  switch (name) {
    case "web_search":
      return handleWebSearch(input);
    case "web_fetch":
      return handleWebFetch(input);
    case "save_note":
      return handleSaveNote(input);
    default:
      return `Unknown tool: ${name}`;
  }
}
