import { readFileSync, writeFileSync } from "node:fs";

import { createProvider, resolveBackend, type Backend } from "../ai/index.js";
import { authenticate } from "../github/auth.js";
import { preprocessReadme } from "../github/readmeFetcher.js";
import { logger } from "../logger.js";
import { corpusEntrySchema, type CorpusEntry } from "./types.js";

/**
 * One-time, BUILD-time corpus generator (not run at eval time). Given a curated
 * list of public `owner/name` repos, fetch each repo's public metadata + README
 * and run the real analyzer over it, then write a frozen `corpus.json`. The
 * committed corpus is what `bun run evals` searches; this script only refreshes
 * it. Requires GITHUB_TOKEN and an AI backend; the eval run itself needs neither.
 *
 *   bun run evals:build-corpus            # reads evals/repos.json → evals/corpus.json
 *   bun run evals:build-corpus --repos X --out Y --backend ollama
 */

const DEFAULT_REPOS = "evals/repos.json";
const DEFAULT_OUT = "evals/corpus.json";

interface RepoMeta {
  description: string;
  language: string | null;
  topics: string[];
  isArchived: boolean;
}

const REPO_QUERY = `
  query ($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      description
      isArchived
      primaryLanguage { name }
      repositoryTopics(first: 20) { nodes { topic { name } } }
    }
  }
`;

interface RepoQueryResponse {
  repository: {
    description: string | null;
    isArchived: boolean;
    primaryLanguage: { name: string } | null;
    repositoryTopics: { nodes: { topic: { name: string } }[] };
  } | null;
}

async function fetchMeta(
  graphqlWithAuth: Awaited<ReturnType<typeof authenticate>>["graphqlWithAuth"],
  owner: string,
  name: string,
): Promise<RepoMeta> {
  const res = await graphqlWithAuth<RepoQueryResponse>(REPO_QUERY, { owner, name });
  if (!res.repository) throw new Error(`repository ${owner}/${name} not found or not public`);
  const r = res.repository;
  return {
    description: r.description ?? "",
    language: r.primaryLanguage?.name ?? null,
    topics: r.repositoryTopics.nodes.map((n) => n.topic.name),
    isArchived: r.isArchived,
  };
}

async function fetchReadme(owner: string, name: string, token: string): Promise<string> {
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}/readme`, {
    headers: { authorization: `token ${token}`, accept: "application/vnd.github.v3+json" },
  });
  if (!res.ok) return "";
  const body = (await res.json()) as { content?: string; encoding?: string };
  if (!body.content || body.encoding !== "base64") return "";
  const decoded = Buffer.from(body.content.replace(/\n/g, ""), "base64").toString("utf-8");
  return preprocessReadme(decoded);
}

function parseRepoList(path: string): { owner: string; name: string }[] {
  const raw = JSON.parse(readFileSync(path, "utf8")) as unknown;
  if (!Array.isArray(raw)) throw new Error(`${path} must be a JSON array of "owner/name" strings`);
  return raw.map((entry) => {
    if (typeof entry !== "string" || !entry.includes("/")) {
      throw new Error(`invalid repo ref ${JSON.stringify(entry)} — expected "owner/name"`);
    }
    const [owner, name] = entry.split("/");
    return { owner, name };
  });
}

interface Args {
  reposPath: string;
  outPath: string;
  backend?: Backend;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { reposPath: DEFAULT_REPOS, outPath: DEFAULT_OUT };
  for (let i = 0; i < argv.length; i++) {
    const next = (): string => argv[++i] ?? "";
    if (argv[i] === "--repos") args.reposPath = next();
    else if (argv[i] === "--out") args.outPath = next();
    else if (argv[i] === "--backend") args.backend = next() as Backend;
  }
  return args;
}

export async function buildCorpus(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const repos = parseRepoList(args.reposPath);
  const backend = resolveBackend(args.backend);
  const { token, graphqlWithAuth } = await authenticate();
  const analyzer = createProvider(args.backend);

  logger.info("corpus build starting", { repoCount: repos.length, backend, out: args.outPath });

  const entries: CorpusEntry[] = [];
  for (const { owner, name } of repos) {
    try {
      const meta = await fetchMeta(graphqlWithAuth, owner, name);
      const readme = await fetchReadme(owner, name, token);
      const analysis = await analyzer.analyze({
        name,
        owner,
        description: meta.description,
        language: meta.language,
        topics: meta.topics,
        readme,
        isArchived: meta.isArchived,
      });
      const entry = corpusEntrySchema.parse({
        owner,
        name,
        topics: meta.topics,
        category: analysis.category,
        killerFeature: analysis.killerFeature,
        description: analysis.description,
      });
      entries.push(entry);
      process.stdout.write(`  ✓ ${owner}/${name} → ${entry.category}\n`);
    } catch (err) {
      process.stderr.write(
        `  ✗ ${owner}/${name}: ${err instanceof Error ? err.message : String(err)}\n`,
      );
    }
  }

  // Sort by repo key so the committed corpus has a stable, diff-friendly order.
  entries.sort((a, b) =>
    `${a.owner}/${a.name}`.toLowerCase() < `${b.owner}/${b.name}`.toLowerCase() ? -1 : 1,
  );
  writeFileSync(args.outPath, JSON.stringify(entries, null, 2) + "\n");
  process.stdout.write(`\nWrote ${entries.length}/${repos.length} entries to ${args.outPath}\n`);
  return entries.length === repos.length ? 0 : 1;
}
