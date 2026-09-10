/**
 * verify.ts
 *
 * Runs `npx playwright test <specFile> --reporter=line` as a child process
 * and returns whether the tests passed plus the full terminal output.
 *
 * This is intentionally a thin wrapper — no retries, no timeout extension.
 * The caller (cli.ts) decides what to do with a failure.
 */

import { spawn } from "node:child_process";

export interface VerifyResult {
  /** True iff the playwright process exited with code 0. */
  passed: boolean;
  /** Full combined stdout + stderr output from the test run. */
  output: string;
}

/**
 * Run the generated spec file with Playwright and return the result.
 *
 * @param specFile  Absolute path to the .spec.ts file to run.
 * @param cwd       Working directory (must contain playwright.config.ts or
 *                  be the project root). Defaults to process.cwd().
 * @param timeoutMs Maximum time to wait for Playwright (default: 60 s).
 */
export function verify(
  specFile: string,
  cwd: string = process.cwd(),
  timeoutMs = 60_000,
): Promise<VerifyResult> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];

    // Use `npx playwright test` so the correct local installation is used
    const child = spawn(
      "npx",
      ["playwright", "test", specFile, "--reporter=line"],
      {
        cwd,
        // Merge stderr into stdout for a single output stream
        stdio: ["ignore", "pipe", "pipe"],
        // Inherit env so PATH and the LLM_* variables are available
        env: process.env,
      },
    );

    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => chunks.push(chunk));

    // Enforce a hard timeout so a hung browser doesn't block the process
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
    }, timeoutMs);

    child.on("close", (code) => {
      clearTimeout(timer);
      const output = Buffer.concat(chunks).toString("utf-8");
      resolve({ passed: code === 0, output });
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        passed: false,
        output: `Failed to spawn playwright: ${err.message}`,
      });
    });
  });
}
