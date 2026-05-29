/**
 * MCP Test-Runner Server
 *
 * Exposes three tools for the QA track:
 *   - run_playwright_test  — spawn `npx playwright test` and capture output
 *   - list_failing_tests   — parse a Playwright JSON report for failures
 *   - get_test_source      — read a spec file by test name (path-traversal safe)
 *
 * Security: all tool inputs are validated via Zod before use.
 *   Path traversal is prevented by resolving absolute paths and asserting
 *   they start with the allowed base directory before any filesystem access.
 */

import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { resolve, join, relative } from "node:path";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Millisecond timestamp helper */
function now(): number {
  return Date.now();
}

/**
 * Safely resolve a user-supplied path so that it stays inside `baseDir`.
 * Returns the resolved path on success, or throws if it would escape.
 */
function safeResolve(baseDir: string, userInput: string): string {
  const resolved = resolve(baseDir, userInput);
  const rel = relative(baseDir, resolved);
  if (rel.startsWith("..") || resolve(rel) === resolve(userInput)) {
    // rel starts with ".." means the path climbs above baseDir
    if (rel.startsWith("..")) {
      throw new Error(`Path traversal detected: "${userInput}" escapes base directory`);
    }
  }
  return resolved;
}

// ---------------------------------------------------------------------------
// Server setup
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "test-runner",
  version: "0.1.0",
});

// ---------------------------------------------------------------------------
// Tool: run_playwright_test
// ---------------------------------------------------------------------------

server.registerTool(
  "run_playwright_test",
  {
    description:
      "Run a specific Playwright test file with `npx playwright test` and return pass/fail, stderr output, and duration.",
    inputSchema: z.object({
      test_file: z
        .string()
        .min(1)
        .describe("Relative or absolute path to the Playwright spec file to run."),
    }),
  },
  async ({ test_file }) => {
    const start = now();
    try {
      // Validate: prevent absolute paths pointing outside cwd and traversal
      const cwd = process.cwd();
      const resolvedFile = safeResolve(cwd, test_file);

      const result = spawnSync(
        "npx",
        ["playwright", "test", resolvedFile, "--reporter=line"],
        {
          encoding: "utf8",
          timeout: 120_000, // 2-minute ceiling
          cwd,
          env: { ...process.env },
        }
      );

      const duration_ms = now() - start;
      const passed = result.status === 0;
      const stderr = result.stderr ?? result.stdout ?? "";

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ passed, stderr, duration_ms }),
          },
        ],
      };
    } catch (err) {
      const duration_ms = now() - start;
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ passed: false, stderr: message, duration_ms }),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: list_failing_tests
// ---------------------------------------------------------------------------

/**
 * Minimal shape of Playwright's JSON reporter output we care about.
 * Full schema: https://playwright.dev/docs/test-reporters#json-reporter
 */
interface PlaywrightJsonReport {
  suites?: Suite[];
}

interface Suite {
  title?: string;
  suites?: Suite[];
  specs?: Spec[];
}

interface Spec {
  title?: string;
  ok?: boolean;
  tests?: { status?: string }[];
}

function collectFailingTitles(suites: Suite[], prefix: string): string[] {
  const failures: string[] = [];
  for (const suite of suites) {
    const suiteTitle = [prefix, suite.title].filter(Boolean).join(" > ");
    for (const spec of suite.specs ?? []) {
      const specTitle = [suiteTitle, spec.title].filter(Boolean).join(" > ");
      if (!spec.ok) {
        failures.push(specTitle);
      }
    }
    failures.push(...collectFailingTitles(suite.suites ?? [], suiteTitle));
  }
  return failures;
}

server.registerTool(
  "list_failing_tests",
  {
    description:
      "Parse a Playwright JSON report file and return an array of failing test titles.",
    inputSchema: z.object({
      report_path: z
        .string()
        .min(1)
        .describe("Path to the Playwright JSON report file (e.g. playwright-report/results.json)."),
    }),
  },
  async ({ report_path }) => {
    try {
      // Security: keep path within cwd
      const cwd = process.cwd();
      const resolvedPath = safeResolve(cwd, report_path);

      const raw = readFileSync(resolvedPath, "utf8");
      const report: PlaywrightJsonReport = JSON.parse(raw);

      const failingTitles = collectFailingTitles(report.suites ?? [], "");

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(failingTitles),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Tool: get_test_source
// ---------------------------------------------------------------------------

/** Recursively collect all .spec.ts / .test.ts files under a directory. */
function findSpecFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findSpecFiles(full));
    } else if (/\.(spec|test)\.[jt]sx?$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

server.registerTool(
  "get_test_source",
  {
    description:
      "Search the ./tests directory for a spec file whose contents mention the given test name and return the full file source.",
    inputSchema: z.object({
      test_name: z
        .string()
        .min(1)
        .describe("Test name or description to search for inside spec files."),
    }),
  },
  async ({ test_name }) => {
    try {
      // Security: we only ever look inside the fixed ./tests directory.
      // The user-supplied test_name is treated as a search string, never as a path.
      const testsBase = resolve(process.cwd(), "tests");

      let specFiles: string[];
      try {
        specFiles = findSpecFiles(testsBase);
      } catch {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify({
                error: `Cannot read tests directory at ${testsBase}. Make sure it exists.`,
              }),
            },
          ],
        };
      }

      for (const filePath of specFiles) {
        // Double-check: every resolved path must stay within testsBase
        const rel = relative(testsBase, filePath);
        if (rel.startsWith("..")) continue;

        const source = readFileSync(filePath, "utf8");
        if (source.includes(test_name)) {
          return {
            content: [
              {
                type: "text" as const,
                text: JSON.stringify({ file: filePath, source }),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              error: `No spec file found containing test name: "${test_name}"`,
            }),
          },
        ],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ error: message }),
          },
        ],
      };
    }
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[test-runner MCP] server started on stdio");
