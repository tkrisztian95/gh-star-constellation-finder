import { readFileSync } from "node:fs";

import {
  corpusSchema,
  querysetSchema,
  repoKey,
  repoUrl,
  type CorpusEntry,
  type Query,
} from "./types.js";

/** Thrown for any fixture problem so the runner can exit non-zero with a clear message. */
export class FixtureError extends Error {}

function readJson(path: string): unknown {
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch (err) {
    throw new FixtureError(
      `cannot read fixture at ${path}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new FixtureError(
      `fixture at ${path} is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** Load + validate the corpus; on invalid shape, throw naming the offending entry. */
export function loadCorpus(path: string): CorpusEntry[] {
  const parsed = corpusSchema.safeParse(readJson(path));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` (entry ${issue.path.join(".")})` : "";
    throw new FixtureError(`corpus fixture invalid${where}: ${issue?.message ?? "unknown error"}`);
  }
  return parsed.data;
}

/** Load + validate the queryset. */
export function loadQueryset(path: string): Query[] {
  const parsed = querysetSchema.safeParse(readJson(path));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` (query ${issue.path.join(".")})` : "";
    throw new FixtureError(
      `queryset fixture invalid${where}: ${issue?.message ?? "unknown error"}`,
    );
  }
  return parsed.data;
}

/**
 * Cross-check every ground-truth URL against the corpus. A dangling reference
 * (a query pointing at a repo not in the corpus) is the most likely authoring
 * mistake and must fail loudly rather than silently scoring 0.
 */
export function crossCheck(corpus: CorpusEntry[], queryset: Query[]): void {
  const present = new Set(corpus.map((e) => repoKey(repoUrl(e))));
  const dangling: string[] = [];
  for (const q of queryset) {
    for (const url of q.expected) {
      if (!present.has(repoKey(url))) {
        dangling.push(`"${q.question}" → ${url}`);
      }
    }
  }
  if (dangling.length > 0) {
    throw new FixtureError(
      `queryset references ${dangling.length} repo(s) absent from the corpus:\n  ${dangling.join("\n  ")}`,
    );
  }
}
