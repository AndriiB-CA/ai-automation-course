/**
 * check-provider.ts — one trivial request, to prove your .env works.
 *
 *   npm run check-provider
 *
 * If this passes, every project in the course will run against your provider.
 * If it fails, the error tells you which of the four variables is wrong.
 */

import "dotenv/config";
import process from "node:process";
import { createClient, explainError, formatUsage, getModel, getSmallModel } from "./llm.js";

async function ping(client: ReturnType<typeof createClient>, model: string, label: string) {
  const started = Date.now();
  const completion = await client.chat.completions.create({
    model,
    max_tokens: 16,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
  });
  const ms = Date.now() - started;
  const text = completion.choices[0]?.message?.content?.trim() ?? "(empty)";
  console.log(`✓ ${label.padEnd(6)} ${text.padEnd(6)} ${ms}ms · ${formatUsage(model, completion.usage)}`);
}

async function main() {
  console.log(`base URL : ${process.env.LLM_BASE_URL ?? "(unset)"}`);
  console.log(`key      : ${process.env.LLM_API_KEY ? "set" : "(unset — fine for Ollama)"}`);

  const client = createClient();
  const model = getModel();
  const small = getSmallModel();

  await ping(client, model, "main");
  if (small !== model) await ping(client, small, "small");

  if (!process.env.LLM_PRICE_IN_PER_MTOK || !process.env.LLM_PRICE_OUT_PER_MTOK) {
    console.log(
      "\nℹ Cost reporting is off. Add LLM_PRICE_IN_PER_MTOK and LLM_PRICE_OUT_PER_MTOK\n" +
        "  from your provider's pricing page to see dollars instead of token counts.",
    );
  }
}

main().catch((err) => {
  console.error(`✗ ${explainError(err)}`);
  process.exit(1);
});
