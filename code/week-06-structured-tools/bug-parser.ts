/**
 * Week 3 — Structured Outputs with Zod
 *
 * Parses messy free-text bug reports into a strict schema.
 * Retries up to 3 times if validation fails.
 *
 * Why tool calling and not a JSON mode? Because `response_format: json_schema`
 * and `strict: true` are unevenly supported across OpenAI-compatible providers —
 * several accept the field and then ignore it, which is the worst failure mode
 * there is. Tool calling works nearly everywhere, and validating the result
 * yourself is something you should do regardless of what the provider promises.
 *
 * This code pattern is the foundation for:
 *   - Extracting structured data from LLM output
 *   - Building reliable data pipelines with fuzzy inputs
 *   - Your capstone's test-spec generation
 *
 * Run (any provider — see PROVIDERS.md):
 *   export LLM_BASE_URL=https://api.groq.com/openai/v1
 *   export LLM_API_KEY=...
 *   export LLM_MODEL=...
 *   npx tsx bug-parser.ts
 */

import OpenAI from "openai";
import { z } from "zod";

// ---- The schema is the source of truth ------------------------------------
const BugReport = z.object({
  title: z.string().min(5).max(80),
  severity: z.enum(["low", "medium", "high", "critical"]),
  steps_to_reproduce: z.array(z.string().min(3)).min(1).max(10),
  expected_behavior: z.string().min(5),
  actual_behavior: z.string().min(5),
  environment: z
    .object({
      os: z.string().optional(),
      browser: z.string().optional(),
      version: z.string().optional(),
    })
    .optional(),
  raw_text: z.string(), // original input kept for auditing
});

type BugReport = z.infer<typeof BugReport>;

// ---- The LLM-facing schema (the tool's parameters) ------------------------
// Note this is written by hand rather than generated from the Zod schema. Two
// schemas, deliberately: the tool schema is a *prompt* (descriptions steer the
// model), the Zod schema is an *assertion* (it decides what you accept). Later
// projects generate one from the other; here they're separate so you can see
// the two jobs clearly.
const BUG_REPORT_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "emit_bug_report",
    description:
      "Emit a structured bug report parsed from the user's free-text description.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Concise title (≤80 chars), imperative mood ('Fix X')",
        },
        severity: {
          type: "string",
          enum: ["low", "medium", "high", "critical"],
          description:
            "low = cosmetic; medium = functional degradation with workaround; high = significant broken feature; critical = data loss / security / outage",
        },
        steps_to_reproduce: {
          type: "array",
          items: { type: "string" },
          description: "Numbered steps in order. One step per array element.",
        },
        expected_behavior: { type: "string" },
        actual_behavior: { type: "string" },
        environment: {
          type: "object",
          properties: {
            os: { type: "string" },
            browser: { type: "string" },
            version: { type: "string" },
          },
        },
      },
      required: [
        "title",
        "severity",
        "steps_to_reproduce",
        "expected_behavior",
        "actual_behavior",
      ],
    },
  },
};

// ---- The parser with retry ------------------------------------------------
const client = new OpenAI({
  baseURL: process.env.LLM_BASE_URL,
  apiKey: process.env.LLM_API_KEY || "not-needed",
});
const MODEL = process.env.LLM_MODEL;
const MAX_ATTEMPTS = 3;

if (!MODEL) {
  console.error("Set LLM_BASE_URL, LLM_API_KEY and LLM_MODEL. See PROVIDERS.md.");
  process.exit(1);
}

async function parseBugReport(rawText: string): Promise<BugReport> {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const systemPrompt = `You extract structured bug reports from messy free-text descriptions.
ALWAYS respond by calling the \`emit_bug_report\` tool — never by regular text.
If the input is ambiguous, make reasonable assumptions and flag them in the title.`;

    const correctionHint =
      attempt > 1
        ? `\n\nYour previous attempt failed validation with: ${String(lastError)}\nFix the schema issues and try again.`
        : "";

    const completion = await client.chat.completions.create({
      model: MODEL!,
      max_tokens: 1024,
      temperature: 0,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Parse this bug report:${correctionHint}\n\n<input>\n${rawText}\n</input>`,
        },
      ],
      tools: [BUG_REPORT_TOOL],
      // Force the tool. Without this, models sometimes narrate instead of calling.
      tool_choice: { type: "function", function: { name: "emit_bug_report" } },
    });

    const call = completion.choices[0]?.message?.tool_calls?.[0];
    if (!call || !("function" in call)) {
      lastError = new Error("No tool call in response");
      continue;
    }

    let candidate: unknown;
    try {
      candidate = { ...JSON.parse(call.function.arguments), raw_text: rawText };
    } catch (e) {
      // Models do emit malformed JSON occasionally. That's a validation
      // failure like any other — retry rather than crash.
      lastError = e;
      console.error(`Attempt ${attempt}: tool arguments were not valid JSON`);
      continue;
    }

    const parsed = BugReport.safeParse(candidate);

    if (parsed.success) {
      return parsed.data;
    }

    lastError = parsed.error.flatten();
    console.error(`Attempt ${attempt} validation failed:`, lastError);
  }

  throw new Error(
    `Failed to parse bug report after ${MAX_ATTEMPTS} attempts. Last error: ${String(
      lastError,
    )}`,
  );
}

// ---- Demo -----------------------------------------------------------------
const SAMPLE = `
hey team so the checkout button is broken. like sometimes when I click "Buy Now" on the
product page (chrome on mac, latest) nothing happens. no error, no spinner, just
dead. reloading the page fixes it for like a minute then it breaks again. should
charge my card but it's not even opening the modal. this is really bad we're losing
money right now.
`;

async function main() {
  console.log("Input:", SAMPLE.trim());
  console.log("\nParsing...\n");

  const result = await parseBugReport(SAMPLE);
  console.log("✓ Parsed:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((e) => {
  console.error("✗", e);
  process.exit(1);
});
