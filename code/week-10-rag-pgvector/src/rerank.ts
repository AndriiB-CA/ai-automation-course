/**
 * Portable reranker: ask LLM_MODEL_SMALL to reorder hybrid hits.
 *
 * A hosted reranker is usually cheaper and better at this one job. This
 * function exists so the Week 11 measurement runs on the same provider
 * contract as the rest of the course. Swap it for a dedicated endpoint
 * later, behind this function, once you have measured that it wins.
 */
import type OpenAI from "openai";
import { createClient, getSmallModel } from "./llm.js";
import type { SearchResult } from "./search.js";

let client: OpenAI | undefined;
function llm(): OpenAI {
  if (!client) client = createClient();
  return client;
}

export async function rerank(query: string, hits: SearchResult[], k = 5): Promise<SearchResult[]> {
  if (hits.length <= 1) return hits.slice(0, k);

  const numbered = hits
    .map((hit, i) => `[${i}] ${hit.content.slice(0, 400).replace(/\s+/g, " ")}`)
    .join("\n\n");

  const response = await llm().chat.completions.create({
    model: getSmallModel(),
    temperature: 0,
    max_tokens: 200,
    messages: [
      {
        role: "system",
        content:
          "You reorder search hits for a query. Reply with only a JSON array of hit indexes, best first. No prose.",
      },
      {
        role: "user",
        content: `Query: ${query}\n\nHits:\n${numbered}\n\nReturn the top ${k} indexes as a JSON array.`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "";
  const match = raw.match(/\[[\s\d,]*\]/);
  if (!match) return hits.slice(0, k);

  let indexes: unknown;
  try {
    indexes = JSON.parse(match[0]);
  } catch {
    return hits.slice(0, k);
  }
  if (!Array.isArray(indexes)) return hits.slice(0, k);

  const ordered: SearchResult[] = [];
  for (const index of indexes) {
    if (typeof index !== "number" || !Number.isInteger(index)) continue;
    const hit = hits[index];
    if (hit && !ordered.includes(hit)) ordered.push(hit);
  }
  for (const hit of hits) {
    if (!ordered.includes(hit)) ordered.push(hit);
  }
  return ordered.slice(0, k);
}
