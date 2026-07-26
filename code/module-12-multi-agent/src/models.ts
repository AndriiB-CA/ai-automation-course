export const MANAGER_MODEL = "claude-opus-5";
export const WORKER_MODEL = "claude-haiku-4-5-20251001";

// Pricing (USD per million tokens) — update if Anthropic changes pricing
export const PRICING = {
  [MANAGER_MODEL]: { input: 5.0, output: 25.0 },
  [WORKER_MODEL]: { input: 1.0, output: 5.0 },
} as const;

export interface UsageStats {
  inputTokens: number;
  outputTokens: number;
  estimatedCostUSD: number;
}

export function calcCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): UsageStats {
  const prices = PRICING[model as keyof typeof PRICING] ?? { input: 3.0, output: 15.0 };
  const estimatedCostUSD =
    (inputTokens / 1_000_000) * prices.input +
    (outputTokens / 1_000_000) * prices.output;
  return { inputTokens, outputTokens, estimatedCostUSD };
}

export function addUsage(a: UsageStats, b: UsageStats): UsageStats {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    estimatedCostUSD: a.estimatedCostUSD + b.estimatedCostUSD,
  };
}
