import type { Backend } from "../ai/index.js";
import pkg from "../../package.json" with { type: "json" };

export interface CliArgs {
  backend?: Backend;
  limit?: number;
  concurrency: number;
  analyzeOnly: boolean;
  outputPath?: string;
  exportCorpusPath?: string;
  constellationPath?: string;
  noAnalytics: boolean;
  noCache: boolean;
}

export function wantsHelp(argv: string[]): boolean {
  return argv.includes("--help") || argv.includes("-h");
}

export function wantsVersion(argv: string[]): boolean {
  return argv.includes("--version") || argv.includes("-v");
}

export function getVersionText(): string {
  return `${pkg.name} v${pkg.version}\n`;
}

export function getHelpText(): string {
  return String.raw`gh-star-constellation-finder — organise your GitHub stars into native lists with AI

Usage:
  gh-star-constellation-finder [options]

Options:
  --backend <name>      AI backend: openai or ollama (default: openai)
  --limit <n>           Limit number of repos analysed (default: all)
  --concurrency <n>     Parallel README fetch concurrency (default: 5)
  --analyze-only        Headless mode: skip TUI, print JSON to stdout
  --output <path>       With --analyze-only: write to a file instead of stdout
  --export-corpus <path>  Headless: analyse stars, write a corpus.json (the
                        cross-project contract) and exit (skips suggestions)
  --constellation <dir>   Headless: analyse stars, build the entity co-occurrence
                        graph, write <dir>/constellation.{gexf,json} and exit
  --no-cache            Skip the local analysis cache (re-analyse every repo)
  --no-analytics        Disable PostHog product analytics for this run
  -h, --help            Show this help and exit
  -v, --version         Show the version and exit

Examples:
  # Local inference with Ollama using Gemma 4 (recommended — much better than llama3)
  GITHUB_TOKEN=ghp_xxx OLLAMA_MODEL=gemma4 gh-star-constellation-finder --backend ollama

  # Same, plus a custom Ollama host and a 20-repo dry run
  GITHUB_TOKEN=ghp_xxx OLLAMA_HOST=http://localhost:11434 OLLAMA_MODEL=gemma4 \\
    gh-star-constellation-finder --backend ollama --limit 20 --analyze-only

  # Or pin to llama3 if you already have it pulled
  GITHUB_TOKEN=ghp_xxx OLLAMA_MODEL=llama3 gh-star-constellation-finder --backend ollama

  # OpenAI backend (default)
  GITHUB_TOKEN=ghp_xxx OPENAI_API_KEY=sk-xxx gh-star-constellation-finder

Environment variables:
  GITHUB_TOKEN          (required) Classic PAT with user + repo scopes
  OPENAI_API_KEY        OpenAI key (when --backend openai)
  OLLAMA_HOST           Ollama base URL (default: http://localhost:11434)
  OLLAMA_MODEL          Ollama model name (default: llama3)
  POSTHOG_API_KEY       Optional: enables PostHog analytics
  LANGFUSE_PUBLIC_KEY   Optional: enables Langfuse prompt tracing (paired with LANGFUSE_SECRET_KEY)
  LOG_LEVEL             debug | info | warn | error (default: info)
  LOG_FILE              JSONL log path (default: $XDG_STATE_HOME/gh-star-constellation-finder/app.log)

Docs:
  README     https://github.com/tkrisztian95/gh-star-constellation-finder
  Issues     https://github.com/tkrisztian95/gh-star-constellation-finder/issues
  GitHub PAT https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic
  Ollama     https://ollama.com/download
`;
}

export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);

  if (wantsHelp(args)) {
    process.stdout.write(getHelpText());
    process.exit(0);
  }

  if (wantsVersion(args)) {
    process.stdout.write(getVersionText());
    process.exit(0);
  }

  const result: CliArgs = {
    concurrency: 5,
    analyzeOnly: false,
    noAnalytics: false,
    noCache: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--backend" && args[i + 1]) {
      result.backend = args[i + 1] as Backend;
      i++;
    } else if (args[i] === "--limit" && args[i + 1]) {
      result.limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--concurrency" && args[i + 1]) {
      result.concurrency = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === "--analyze-only") {
      result.analyzeOnly = true;
    } else if (args[i] === "--output" && args[i + 1]) {
      result.outputPath = args[i + 1];
      i++;
    } else if (args[i] === "--export-corpus" && args[i + 1]) {
      result.exportCorpusPath = args[i + 1];
      i++;
    } else if (args[i] === "--constellation" && args[i + 1]) {
      result.constellationPath = args[i + 1];
      i++;
    } else if (args[i] === "--no-analytics") {
      result.noAnalytics = true;
    } else if (args[i] === "--no-cache") {
      result.noCache = true;
    }
  }

  if (result.outputPath && !result.analyzeOnly) {
    process.stderr.write("Error: --output requires --analyze-only\n");
    process.exit(1);
  }

  return result;
}
