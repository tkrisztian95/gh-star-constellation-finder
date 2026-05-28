import { Database, type Statement } from "bun:sqlite";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

import { logger } from "../logger.js";
import type { AnalysisResult } from "../types.js";

export const DEFAULT_CACHE_PATH = ".cache/analysis.db";

const SCHEMA_VERSION = 2;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS entries (
    key            TEXT PRIMARY KEY,
    category       TEXT NOT NULL,
    killer_feature TEXT NOT NULL,
    description    TEXT NOT NULL,
    data_quality   TEXT,
    updated_at     INTEGER NOT NULL
  ) WITHOUT ROWID;
`;

interface EntryRow {
  category: string;
  killer_feature: string;
  description: string;
  data_quality: "full" | "sparse" | "truncated" | null;
}

type SaveParams = [string, string, string, string, string | null, number];

export interface AnalysisCache {
  get(repoId: string, readme: string): AnalysisResult | null;
  saveEntry(repoId: string, readme: string, result: AnalysisResult): Promise<void>;
  readonly size: number;
}

export function cacheKey(repoId: string, readme: string): string {
  const hash = createHash("sha256").update(readme).digest("hex");
  return `${repoId}:${hash}`;
}

function applySchema(db: Database): void {
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA synchronous = NORMAL;");

  const userVersion = db.query("PRAGMA user_version").get() as { user_version: number } | null;
  const currentVersion = userVersion?.user_version ?? 0;
  if (currentVersion < SCHEMA_VERSION) {
    // The schema shape changed (e.g. a new NOT NULL column). v1 rows have no
    // description to backfill, so drop and recreate — the next run re-analyses.
    logger.warn("analysis cache schema outdated; dropping entries and recreating", {
      from: currentVersion,
      to: SCHEMA_VERSION,
    });
    db.exec("DROP TABLE IF EXISTS entries;");
  }

  db.exec(CREATE_TABLE_SQL);
  db.exec(`PRAGMA user_version = ${SCHEMA_VERSION};`);
}

async function openWithRecovery(filePath: string): Promise<Database> {
  await fs.mkdir(dirname(filePath), { recursive: true });

  try {
    const db = new Database(filePath);
    applySchema(db);
    return db;
  } catch (openErr) {
    // The file exists but is not a valid SQLite database (or otherwise unreadable).
    // Preserve it under <path>.broken.<timestamp> so the user can inspect, then
    // start fresh at the original path.
    const brokenPath = `${filePath}.broken.${Date.now()}`;
    try {
      await fs.rename(filePath, brokenPath);
    } catch (renameErr) {
      logger.error("analysis cache could not be quarantined; rethrowing open error", {
        path: filePath,
        renameError: renameErr instanceof Error ? renameErr.message : String(renameErr),
        openError: openErr instanceof Error ? openErr.message : String(openErr),
      });
      throw openErr;
    }
    logger.warn("analysis cache unreadable; quarantined and starting empty", {
      path: filePath,
      broken: brokenPath,
      error: openErr instanceof Error ? openErr.message : String(openErr),
    });
    const fresh = new Database(filePath);
    applySchema(fresh);
    return fresh;
  }
}

export async function loadCache(filePath: string = DEFAULT_CACHE_PATH): Promise<AnalysisCache> {
  const db = await openWithRecovery(filePath);

  const selectStmt: Statement<EntryRow, [string]> = db.query(
    "SELECT category, killer_feature, description, data_quality FROM entries WHERE key = ?",
  );
  const upsertStmt: Statement<unknown, SaveParams> = db.query(
    "INSERT OR REPLACE INTO entries (key, category, killer_feature, description, data_quality, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
  );
  const countStmt: Statement<{ n: number }, []> = db.query("SELECT COUNT(*) AS n FROM entries");

  logger.info("analysis cache opened", {
    path: filePath,
    size: countStmt.get()?.n ?? 0,
  });

  return {
    get(repoId, readme) {
      const row = selectStmt.get(cacheKey(repoId, readme));
      if (!row) return null;
      return {
        category: row.category,
        killerFeature: row.killer_feature,
        description: row.description,
        dataQuality: row.data_quality ?? undefined,
      };
    },
    async saveEntry(repoId, readme, result) {
      upsertStmt.run(
        cacheKey(repoId, readme),
        result.category,
        result.killerFeature,
        result.description,
        result.dataQuality ?? null,
        Date.now(),
      );
    },
    get size() {
      return countStmt.get()?.n ?? 0;
    },
  };
}
