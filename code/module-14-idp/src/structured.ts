/**
 * structured.ts — portable structured output.
 *
 * Providers disagree about JSON modes. `response_format: json_schema` is
 * uneven, and `strict: true` is ignored by several OpenAI-compatible endpoints
 * (see the compatibility matrix in PROVIDERS.md). Tool calling, on the other
 * hand, is supported almost everywhere.
 *
 * So: describe the shape as a single forced tool, parse what comes back, and
 * validate it yourself. When validation fails, hand the error back to the model
 * and ask again.
 *
 * That validate-and-retry loop is not a workaround for weak providers — it is
 * what you want in production regardless. A schema flag you did not verify is
 * an assertion you did not write.
 */

import type OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { estimateCost, type Usage } from "./llm.js";

export type GenerateObjectOptions<T extends z.ZodTypeAny> = {
  client: OpenAI;
  model: string;
  schema: T;
  /** Name the shape — models use it as a hint about intent. */
  schemaName?: string;
  system?: string;
  prompt: string;
  /** Extra attempts after the first. Default 2 (so 3 tries total). */
  maxRetries?: number;
  temperature?: number;
};

export type GenerateObjectResult<T> = {
  object: T;
  /** How many requests it actually took. 1 means it validated first try. */
  attempts: number;
  inputTokens: number;
  outputTokens: number;
  usd: number | null;
};

/**
 * Ask for an object matching `schema` and don't return until it validates.
 *
 * @throws if every attempt fails validation — with the last error attached, so
 *         you can see whether the model is confused or the schema is too strict.
 */
export async function generateObject<T extends z.ZodTypeAny>(
  opts: GenerateObjectOptions<T>,
): Promise<GenerateObjectResult<z.infer<T>>> {
  const {
    client,
    model,
    schema,
    schemaName = "result",
    system,
    prompt,
    maxRetries = 2,
    temperature = 0,
  } = opts;

  const jsonSchema = zodToJsonSchema(schema, { target: "openApi3" });

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
  if (system) messages.push({ role: "system", content: system });
  messages.push({ role: "user", content: prompt });

  let inputTokens = 0;
  let outputTokens = 0;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const completion = await client.chat.completions.create({
      model,
      temperature,
      messages,
      tools: [
        {
          type: "function",
          function: {
            name: schemaName,
            description: `Return the ${schemaName} in the required shape.`,
            parameters: jsonSchema as Record<string, unknown>,
          },
        },
      ],
      // Force the tool: without this, models sometimes answer in prose instead.
      tool_choice: { type: "function", function: { name: schemaName } },
    });

    const usage = completion.usage as Usage | undefined;
    inputTokens += usage?.prompt_tokens ?? 0;
    outputTokens += usage?.completion_tokens ?? 0;

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    const raw =
      call && "function" in call
        ? call.function.arguments
        : // Some providers answer in content even when a tool is forced.
          completion.choices[0]?.message?.content;

    try {
      if (!raw) throw new Error("Model returned neither a tool call nor content.");
      const parsed = schema.parse(JSON.parse(raw));
      const { usd } = priceOf(inputTokens, outputTokens);
      return { object: parsed, attempts: attempt, inputTokens, outputTokens, usd };
    } catch (err) {
      lastError = err;
      if (attempt > maxRetries) break;

      // Feed the failure back. Being specific about what was wrong is what
      // makes the retry work — "try again" on its own usually reproduces the
      // same mistake.
      messages.push({
        role: "assistant",
        content: raw ?? "",
      });
      messages.push({
        role: "user",
        content:
          `That did not validate: ${describe(err)}\n` +
          `Return the ${schemaName} again, corrected. Output the tool call only.`,
      });
    }
  }

  throw new Error(
    `generateObject failed after ${maxRetries + 1} attempts: ${describe(lastError)}`,
  );
}

function describe(err: unknown): string {
  if (err instanceof z.ZodError) {
    return err.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
  }
  return err instanceof Error ? err.message : String(err);
}

function priceOf(inputTokens: number, outputTokens: number): { usd: number | null } {
  const { usd } = estimateCost({
    prompt_tokens: inputTokens,
    completion_tokens: outputTokens,
  });
  return { usd };
}
