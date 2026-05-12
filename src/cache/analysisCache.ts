import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

import { z } from "zod";

import { logger } from "../logger.js";
import type { AnalysisResult } from "../types.js";

export const DEFAULT_CACHE_PATH = ".cache/analysis.json";

const entrySchema = z.object({
  category: z.string(),
  killerFeature: z.string(),
  dataQuality: z.enum(["full", "sparse", "truncated"]).optional(),
});

const fileSchema = z.object({
  version: z.literal(1),
  entries: z.record(z.string(), entrySchema),
});

export interface AnalysisCache {
  get(repoId: string, readme: string): AnalysisResult | null;
  saveEntry(repoId: string, readme: string, result: AnalysisResult): Promise<void>;
  readonly size: number;
}

export function cacheKey(repoId: string, readme: string): string {
  const hash = createHash("sha256").update(readme).digest("hex");
  return `${repoId}:${hash}`;
}

export async function loadCache(filePath: string = DEFAULT_CACHE_PATH): Promise<AnalysisCache> {
  const entries = new Map<string, z.infer<typeof entrySchema>>();

  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = fileSchema.parse(JSON.parse(raw));
    for (const [k, v] of Object.entries(parsed.entries)) {
      entries.set(k, v);
    }
    logger.info("analysis cache loaded", { path: filePath, size: entries.size });
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      logger.debug("analysis cache file absent; starting empty", { path: filePath });
    } else {
      logger.warn("analysis cache unreadable; starting empty", {
        path: filePath,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Serialize concurrent writes so the file image stays consistent.
  let writeQueue: Promise<void> = Promise.resolve();
  const flush = async (): Promise<void> => {
    const obj: Record<string, z.infer<typeof entrySchema>> = {};
    for (const [k, v] of entries) obj[k] = v;
    const payload = JSON.stringify({ version: 1, entries: obj }, null, 2);
    await fs.mkdir(dirname(filePath), { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    await fs.writeFile(tmpPath, payload, "utf8");
    await fs.rename(tmpPath, filePath);
  };

  return {
    get(repoId, readme) {
      const entry = entries.get(cacheKey(repoId, readme));
      if (!entry) return null;
      return {
        category: entry.category,
        killerFeature: entry.killerFeature,
        dataQuality: entry.dataQuality,
      };
    },
    async saveEntry(repoId, readme, result) {
      entries.set(cacheKey(repoId, readme), {
        category: result.category,
        killerFeature: result.killerFeature,
        dataQuality: result.dataQuality,
      });
      writeQueue = writeQueue.then(flush, flush);
      await writeQueue;
    },
    get size() {
      return entries.size;
    },
  };
}
