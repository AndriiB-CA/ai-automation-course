import { estimateCost, getModel, getSmallModel } from "./llm.js";

/**
 * Role → model mapping.
 *
 * The manager plans and synthesises; that's the judgement-heavy work, so it
 * gets the better model. Workers execute narrow, well-specified sub-tasks, so
 * they get the cheap one. That split is most of the cost control in a
 * multi-agent system — see Module 7's model ladder.
 *
 * Both come from your .env, so this runs on any provider. If you only set
 * LLM_MODEL, both roles use it and you lose the saving (but it still works).
 */
export const MANAGER_MODEL = (): string => getModel();
export const WORKER_MODEL = (): string => getSmallModel();

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  /** USD, or null when LLM_PRICE_*_PER_MTOK are unset. */
  estimatedCostUSD: number | null;
}

export const ZERO_USAGE: UsageStats = {
  inputTokens: 0,
  outputTokens: 0,
  estimatedCostUSD: null,
};

export function calcCost(inputTokens: number, outputTokens: number): UsageStats {
  const { usd } = estimateCost({
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
  });
  return { inputTokens, outputTokens, estimatedCostUSD: usd };
}

export function addUsage(a: UsageStats, b: UsageStats): UsageStats {
  const usd =
    a.estimatedCostUSD === null && b.estimatedCostUSD === null
      ? null
      : (a.estimatedCostUSD ?? 0) + (b.estimatedCostUSD ?? 0);
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    estimatedCostUSD: usd,
  };
}

export function formatCost(usage: UsageStats): string {
  return usage.estimatedCostUSD === null
    ? `${(usage.inputTokens + usage.outputTokens).toLocaleString()} tok`
    : `$${usage.estimatedCostUSD.toFixed(5)}`;
}

// ── Budget guards ────────────────────────────────────────────────────────────
//
// An agent that can spend without a ceiling is an incident waiting to happen.
// Two ceilings, because only one of them is always available:
//
//   • Token caps always work — every provider reports token counts.
//   • Dollar caps only work once you've told .env what tokens cost.
//
// Enforce both. The token cap is the one that saves you when the price
// variables are unset, which is exactly when you're least paying attention.

export const MANAGER_TOKEN_CAP = 60_000;
export const WORKER_TOKEN_CAP = 15_000;

/** Optional USD ceilings, from .env. Ignored when unset or unpriced. */
export const MANAGER_BUDGET_CAP_USD = Number(process.env.MANAGER_BUDGET_CAP_USD) || null;
export const WORKER_BUDGET_CAP_USD = Number(process.env.WORKER_BUDGET_CAP_USD) || null;

/** Returns a reason string when a cap is breached, or null to continue. */
export function budgetExceeded(
  usage: UsageStats,
  tokenCap: number,
  usdCap: number | null,
): string | null {
  const tokens = usage.inputTokens + usage.outputTokens;
  if (tokens >= tokenCap) {
    return `token cap ${tokenCap.toLocaleString()} reached (${tokens.toLocaleString()} used)`;
  }
  if (usdCap !== null && usage.estimatedCostUSD !== null && usage.estimatedCostUSD >= usdCap) {
    return `budget cap $${usdCap} reached ($${usage.estimatedCostUSD.toFixed(4)} spent)`;
  }
  return null;
}
