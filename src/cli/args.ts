import type { Backend } from "../ai/index.js";

export interface CliArgs {
  backend?: Backend;
  limit?: number;
  concurrency: number;
  analyzeOnly: boolean;
  outputPath?: string;
  noAnalytics: boolean;
  noCache: boolean;
}

export function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
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
