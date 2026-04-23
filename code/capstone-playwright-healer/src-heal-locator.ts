/**
 * HealingLocator — a Playwright Locator that proposes its own fix when it fails.
 *
 * This is the CORE of your capstone. Everything else wraps around it.
 *
 * Usage:
 *   import { heal } from "playwright-healer";
 *
 *   test("login", async ({ page }) => {
 *     await heal(page, { intent: "Log in button" }).click();
 *   });
 */

import type { Page } from "@playwright/test";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

// ---- Proposal schema (what the LLM returns) -------------------------------
const HealProposal = z.object({
  suggestedSelector: z.string().describe("Playwright-compatible locator string"),
  selectorType: z
    .enum(["role", "testid", "text", "css", "xpath"])
    .describe("Preferred selector type — role > testid > text > css > xpath"),
  confidence: z.number().min(0).max(1),
  rationale: z.string().describe("Why this selector matches the intent"),
});
export type HealProposal = z.infer<typeof HealProposal>;

// ---- Emitted record for PRs / audit ---------------------------------------
export interface HealRecord {
  testFile?: string;
  lineNumber?: number;
  intent: string;
  originalError: string;
  proposal: HealProposal;
  screenshotPath?: string;
  timestamp: string;
  cost_usd: number;
}

// ---- Config ---------------------------------------------------------------
interface HealConfig {
  intent: string;
  confidenceThreshold?: number; // default 0.75: auto-retry above this
  maxRetries?: number; // default 1
  emitRecordsDir?: string; // default .healer/ in cwd
  model?: string;
}

// ---- The HealingLocator ---------------------------------------------------
export class HealingLocator {
  private anthropic: Anthropic;
  private readonly threshold: number;
  private readonly maxRetries: number;

  constructor(private page: Page, private config: HealConfig) {
    this.anthropic = new Anthropic();
    this.threshold = config.confidenceThreshold ?? 0.75;
    this.maxRetries = config.maxRetries ?? 1;
  }

  async click(): Promise<void> {
    return this.withHealing((loc) => loc.click());
  }

  async fill(value: string): Promise<void> {
    return this.withHealing((loc) => loc.fill(value));
  }

  async hover(): Promise<void> {
    return this.withHealing((loc) => loc.hover());
  }

  async textContent(): Promise<string | null> {
    return this.withHealing((loc) => loc.textContent());
  }

  // Core pattern: try the inferred selector; on failure, propose a new one
  private async withHealing<T>(
    action: (locator: ReturnType<Page["locator"]>) => Promise<T>,
  ): Promise<T> {
    // First, derive an initial selector from the intent using Playwright best practices
    const initial = this.deriveInitialSelector();

    try {
      return await action(this.page.locator(initial));
    } catch (firstErr) {
      if (this.maxRetries === 0) throw firstErr;

      const proposal = await this.proposeHeal(String(firstErr));
      await this.recordProposal(String(firstErr), proposal);

      if (proposal.confidence < this.threshold) {
        console.warn(
          `[healer] Low confidence (${proposal.confidence.toFixed(2)}): ${
            proposal.suggestedSelector
          }. Not auto-retrying.`,
        );
        throw firstErr;
      }

      console.log(
        `[healer] Auto-retrying with ${proposal.selectorType} selector: ${proposal.suggestedSelector} (confidence: ${proposal.confidence.toFixed(2)})`,
      );
      return await action(this.page.locator(proposal.suggestedSelector));
    }
  }

  private deriveInitialSelector(): string {
    // A simple heuristic: if intent contains a UI role keyword, use role-based.
    // In your real implementation, use an LLM call (cached) or a static rules table.
    const intent = this.config.intent.toLowerCase();
    if (intent.includes("button")) {
      const m = intent.match(/"([^"]+)"|'([^']+)'/);
      if (m) return `role=button[name="${m[1] ?? m[2]}"]`;
      return "role=button";
    }
    if (intent.includes("link")) return "role=link";
    if (intent.includes("input") || intent.includes("field")) return "role=textbox";
    return `text=${this.config.intent}`;
  }

  private async proposeHeal(errorMsg: string): Promise<HealProposal> {
    // Capture current page state (trimmed to fit context window)
    const ariaSnapshot = await this.page.locator("body").ariaSnapshot();
    const screenshot = await this.page.screenshot({ fullPage: false, type: "png" });
    const base64Image = screenshot.toString("base64");

    const tool = {
      name: "propose_heal",
      description: "Propose a new Playwright-compatible locator",
      input_schema: {
        type: "object" as const,
        properties: {
          suggestedSelector: { type: "string" },
          selectorType: {
            type: "string",
            enum: ["role", "testid", "text", "css", "xpath"],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          rationale: { type: "string" },
        },
        required: ["suggestedSelector", "selectorType", "confidence", "rationale"],
      },
    };

    const SYSTEM = `You repair broken Playwright locators. Given a failed locator's intent,
the current page state, and the error, propose a new Playwright-compatible selector.

PREFERENCE ORDER (Playwright best practice):
1. role=<role>[name="..."]   — accessible, resilient
2. [data-testid="..."]        — stable, intentional
3. text=...                   — human-readable but brittle
4. CSS / XPath                — last resort

Be CONSERVATIVE with confidence:
- 0.9+ = the new selector is clearly the same element
- 0.7–0.9 = likely match, risk of false positive
- <0.7 = speculative guess — human must review

Never suggest a selector for a destructive action (delete, submit) with confidence >0.9 unless the match is unambiguous.`;

    const userText = `<intent>${this.config.intent}</intent>

<error>
${errorMsg.slice(0, 500)}
</error>

<page_aria>
${ariaSnapshot.slice(0, 4000)}
</page_aria>

Propose a new locator.`;

    const msg = await this.anthropic.messages.create({
      model: this.config.model ?? "claude-sonnet-4-5",
      max_tokens: 600,
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
      ],
      tools: [tool],
      tool_choice: { type: "tool", name: "propose_heal" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: base64Image },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const toolUse = msg.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error("[healer] LLM did not call propose_heal tool");
    }
    return HealProposal.parse(toolUse.input);
  }

  private async recordProposal(error: string, proposal: HealProposal): Promise<void> {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = this.config.emitRecordsDir ?? ".healer";
    await fs.mkdir(dir, { recursive: true });

    const record: HealRecord = {
      intent: this.config.intent,
      originalError: error.slice(0, 500),
      proposal,
      timestamp: new Date().toISOString(),
      cost_usd: 0, // TODO: compute from message.usage in proposeHeal
    };
    const fname = path.join(
      dir,
      `heal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
    );
    await fs.writeFile(fname, JSON.stringify(record, null, 2));
  }
}

// ---- Ergonomic factory ----------------------------------------------------
export function heal(page: Page, config: HealConfig): HealingLocator {
  return new HealingLocator(page, config);
}
