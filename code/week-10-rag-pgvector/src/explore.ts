/**
 * Week 9 embedding explorer.
 *
 * Embeds a tiny fixed corpus and prints pairwise cosine similarity, plus
 * similarities.csv if you want to plot it yourself. There is no notebook
 * in this folder — this script is the starter.
 *
 *   npm run explore
 *
 * Needs EMBEDDING_BASE_URL / EMBEDDING_MODEL / EMBEDDING_DIMS (and a key).
 * It does not need Postgres.
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { embed } from "./db.js";

const TEXTS = [
  "Fixed a memory leak in the login flow",
  "Resolved a memory issue in authentication",
  "The checkout button is the wrong color",
  "Updated the primary button color on checkout",
  "Flaky test: locator timed out waiting for the dialog",
  "Test failed because the modal never became visible",
  "This sentence is not about software at all, it is about sourdough",
  "Is not a memory leak in the login flow",
];

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function main(): Promise<void> {
  console.log(`Embedding ${TEXTS.length} texts…\n`);
  const vectors: number[][] = [];
  for (const text of TEXTS) {
    vectors.push(await embed(text));
  }

  const header = ["", ...TEXTS.map((_, i) => `t${i}`)].join(",");
  const rows = [header];

  for (let i = 0; i < TEXTS.length; i++) {
    const scores = vectors.map((other) => cosine(vectors[i]!, other).toFixed(3));
    rows.push([`t${i}`, ...scores].join(","));
    console.log(`t${i}  ${TEXTS[i]}`);
  }

  console.log("\nCosine similarity (1 = same direction)\n");
  console.log(rows.join("\n"));
  writeFileSync(new URL("../similarities.csv", import.meta.url), rows.join("\n") + "\n");
  console.log("\nWrote similarities.csv. Negation and paraphrase pairs are the ones to stare at.");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
