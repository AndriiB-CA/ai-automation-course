/**
 * Week 3 — Structured Outputs with Zod
 *
 * Parses messy free-text bug reports into a strict schema.
 * Retries up to 3 times if validation fails.
 *
 * This code pattern is the foundation for:
 *   - Extracting structured data from LLM output
 *   - Building reliable data pipelines with fuzzy inputs
 *   - Your capstone's test-spec generation
 *
 * Run:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   npx tsx bug-parser.ts
 */

import Anthropic from "@anthropic-ai/sdk";
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

// ---- The LLM-facing schema (for the tool description) ---------------------
const BUG_REPORT_TOOL = {
  name: "emit_bug_report",
  description:
    "Emit a structured bug report parsed from the user's free-text description.",
  input_schema: {
    type: "object" as const,
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
};

// ---- The parser with retry ------------------------------------------------
const client = new Anthropic();
const MAX_ATTEMPTS = 3;

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

    const msg = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: systemPrompt,
      tools: [BUG_REPORT_TOOL],
      tool_choice: { type: "tool", name: "emit_bug_report" },
      messages: [
        {
          role: "user",
          content: `Parse this bug report:${correctionHint}\n\n<input>\n${rawText}\n</input>`,
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      lastError = new Error("No tool_use block in response");
      continue;
    }

    const candidate = { ...(toolUse.input as object), raw_text: rawText };
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
