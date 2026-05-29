/**
 * llm.ts — Thin Anthropic client wrapper with prompt-caching support.
 *
 * Exports:
 *   client        — pre-configured Anthropic instance (reads ANTHROPIC_API_KEY)
 *   computeCost() — estimates USD cost from a message's usage object
 *   MODEL_GEN     — model constant for generation tasks (sonnet)
 *   MODEL_HEAL    — model constant for healing tasks (sonnet)
 *   MODEL_JUDGE   — model constant when a stronger judge is needed (opus)
 */

import Anthropic from "@anthropic-ai/sdk";
import "dotenv/config";

// ---------------------------------------------------------------------------
// Model identifiers — update here if Anthropic releases new versions.
// ---------------------------------------------------------------------------

/** Primary model for spec generation and locator healing. */
export const MODEL_GEN = "claude-sonnet-4-6" as const;

/** Alias: same model used at heal-time (kept separate so intent is clear). */
export const MODEL_HEAL = "claude-sonnet-4-6" as const;

/**
 * Stronger judge — only used when evaluating ambiguous heal proposals or
 * running quality-gate evals. Costs ~5× more; use sparingly.
 */
export const MODEL_JUDGE = "claude-opus-4-8" as const;

// ---------------------------------------------------------------------------
// Pricing table (USD per million tokens, as of 2025-Q2)
// Source: https://www.anthropic.com/pricing
// ---------------------------------------------------------------------------

type PriceTier = {
  inputPerMTok: number;
  outputPerMTok: number;
};

const PRICING: Record<string, PriceTier> = {
  // Sonnet 4.6
  "claude-sonnet-4-6": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  // Opus 4.8
  "claude-opus-4-8": { inputPerMTok: 5.0, outputPerMTok: 25.0 },
  // Haiku 4.5 — included so helpers that call it don't error
  "claude-haiku-4-5-20251001": { inputPerMTok: 1.0, outputPerMTok: 5.0 },
};

// ---------------------------------------------------------------------------
// Client
// The SDK reads ANTHROPIC_API_KEY automatically from the environment.
// defaultHeaders enable prompt-caching beta on every request that opts in.
// ---------------------------------------------------------------------------

export const client = new Anthropic({
  defaultHeaders: {
    // Opt-in to the prompt-caching beta globally; individual messages still
    // need cache_control blocks on the content they want cached.
    "anthropic-beta": "prompt-caching-2024-07-31",
  },
});

// ---------------------------------------------------------------------------
// computeCost
// ---------------------------------------------------------------------------

/**
 * Estimate the USD cost of a single Anthropic message response.
 *
 * @param usage  The `usage` object from an `Anthropic.Message`.
 * @param model  Model string (defaults to MODEL_GEN / sonnet pricing).
 * @returns      Estimated cost in USD.
 *
 * @example
 *   const msg = await client.messages.create({ ... });
 *   const cost = computeCost(msg.usage, msg.model);
 *   console.log(`Cost: $${cost.toFixed(6)}`);
 */
export function computeCost(
  usage: Anthropic.Usage,
  model: string = MODEL_GEN,
): number {
  const tier = PRICING[model] ?? PRICING[MODEL_GEN];

  const inputTokens = usage.input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;

  // cache_read_input_tokens are billed at a discount (~10 % of normal input
  // price). If the field is absent the SDK didn't report caching, so we skip.
  const cacheReadTokens =
    "cache_read_input_tokens" in usage
      ? ((usage as Record<string, number>)["cache_read_input_tokens"] ?? 0)
      : 0;

  // cache_creation_input_tokens are billed at a small write surcharge (~25%).
  const cacheWriteTokens =
    "cache_creation_input_tokens" in usage
      ? ((usage as Record<string, number>)["cache_creation_input_tokens"] ?? 0)
      : 0;

  const inputCost =
    ((inputTokens - cacheReadTokens - cacheWriteTokens) / 1_000_000) *
    tier.inputPerMTok;
  const cacheReadCost =
    (cacheReadTokens / 1_000_000) * tier.inputPerMTok * 0.1;
  const cacheWriteCost =
    (cacheWriteTokens / 1_000_000) * tier.inputPerMTok * 1.25;
  const outputCost = (outputTokens / 1_000_000) * tier.outputPerMTok;

  return Math.max(0, inputCost + cacheReadCost + cacheWriteCost + outputCost);
}

// ---------------------------------------------------------------------------
// Convenience: extract text from a message (first text block)
// ---------------------------------------------------------------------------

/**
 * Pull the first text block out of a message response.
 * Throws if the message contains no text content (e.g. it's tool-use only).
 */
export function extractText(msg: Anthropic.Message): string {
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("LLM response contained no text block");
  }
  return block.text;
}
