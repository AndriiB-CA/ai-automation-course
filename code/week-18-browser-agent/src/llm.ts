/**
 * llm.ts — provider-neutral LLM client.
 *
 * Every project in this course talks to a model through the OpenAI-compatible
 * Chat Completions API, so switching providers is an .env change, not a code
 * change. See ../../PROVIDERS.md for base URLs and setup.
 *
 * Required environment:
 *   LLM_BASE_URL   e.g. https://api.groq.com/openai/v1
 *   LLM_API_KEY    your key for that provider
 *   LLM_MODEL      the model ID to use
 *
 * Optional:
 *   LLM_MODEL_SMALL          cheaper model for high-volume steps
 *   LLM_PRICE_IN_PER_MTOK    USD per million input tokens
 *   LLM_PRICE_OUT_PER_MTOK   USD per million output tokens
 */

import OpenAI from "openai";
import process from "node:process";

const SETUP_HINT =
  "Set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL in your environment or .env file.\n" +
  "  See PROVIDERS.md at the repo root for base URLs and where to get a key.";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.\n  ${SETUP_HINT}`);
  }
  return value;
}

/** The model used for normal work. */
export function getModel(): string {
  return required("LLM_MODEL");
}

/**
 * A cheaper/faster model for high-volume or low-stakes steps (routing,
 * classification, first-pass filtering). Falls back to the main model so a
 * minimal .env still runs — see Module 7 for why you want both.
 */
export function getSmallModel(): string {
  return process.env.LLM_MODEL_SMALL || getModel();
}

/**
 * Build the client. Any OpenAI-compatible endpoint works: OpenAI, xAI, Groq,
 * Google, Anthropic, OpenRouter, Ollama, vLLM, LM Studio, ...
 *
 * Ollama ignores the key but the SDK requires a non-empty string, so we
 * default it rather than making you invent one.
 */
export function createClient(): OpenAI {
  const baseURL = required("LLM_BASE_URL");
  const apiKey = process.env.LLM_API_KEY || "not-needed";
  return new OpenAI({ baseURL, apiKey });
}

// ---------------------------------------------------------------------------
// Cost
// ---------------------------------------------------------------------------

export type Usage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

export type CostEstimate = {
  inputTokens: number;
  outputTokens: number;
  /** USD, or null when the price variables are unset. */
  usd: number | null;
};

/**
 * Estimate the cost of one response.
 *
 * Prices are deliberately NOT hardcoded per model. They change constantly and
 * differ per provider, so a table baked into this repo would quietly teach you
 * wrong arithmetic. Read your provider's pricing page once, put the two numbers
 * in .env, and this does the multiplication. Unset means "print tokens, skip
 * dollars" — which is honest, where a stale number is not.
 */
export function estimateCost(usage: Usage | undefined): CostEstimate {
  const inputTokens = usage?.prompt_tokens ?? 0;
  const outputTokens = usage?.completion_tokens ?? 0;

  const inPrice = Number(process.env.LLM_PRICE_IN_PER_MTOK);
  const outPrice = Number(process.env.LLM_PRICE_OUT_PER_MTOK);
  if (!Number.isFinite(inPrice) || !Number.isFinite(outPrice)) {
    return { inputTokens, outputTokens, usd: null };
  }

  const usd = (inputTokens / 1_000_000) * inPrice + (outputTokens / 1_000_000) * outPrice;
  return { inputTokens, outputTokens, usd };
}

/** One-line usage report for stderr. */
export function formatUsage(model: string, usage: Usage | undefined): string {
  const { inputTokens, outputTokens, usd } = estimateCost(usage);
  const cost =
    usd === null
      ? "cost=? (set LLM_PRICE_IN_PER_MTOK / LLM_PRICE_OUT_PER_MTOK)"
      : `cost=$${usd.toFixed(6)}`;
  return `${model} · in=${inputTokens} out=${outputTokens} · ${cost}`;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/** Pull the assistant text out of a completion, or throw if there is none. */
export function extractText(completion: OpenAI.Chat.Completions.ChatCompletion): string {
  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error(
      `Model returned no text (finish_reason=${completion.choices[0]?.finish_reason}).`,
    );
  }
  return content;
}

/**
 * Turn a provider error into something a human can act on. Compatibility gaps
 * surface here: a 400 naming an unsupported field usually means this provider
 * doesn't implement it (see the matrix in PROVIDERS.md).
 */
export function explainError(err: unknown): string {
  if (err instanceof OpenAI.APIError) {
    const hint =
      err.status === 401
        ? "  → LLM_API_KEY doesn't match LLM_BASE_URL. Are they from the same provider?"
        : err.status === 404
          ? "  → Check LLM_MODEL is a current model ID, and that LLM_BASE_URL ends in /v1."
          : err.status === 400
            ? "  → This provider may not support a field being sent. See PROVIDERS.md."
            : err.status === 429
              ? "  → Rate limited. Back off and retry, or switch to a smaller model."
              : "";
    return `${err.status} ${err.message}${hint ? `\n${hint}` : ""}`;
  }
  return err instanceof Error ? err.message : String(err);
}
