import { Database, type Statement } from "bun:sqlite";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { dirname } from "node:path";

import { logger } from "../logger.js";
import { coerceEntities, type Entity } from "../ai/entityFilter.js";
import type { AnalysisResult } from "../types.js";

export const DEFAULT_CACHE_PATH = ".cache/analysis.db";

/** Parse the JSON entities column, tolerating malformed values. */
function parseEntitiesColumn(raw: string): Entity[] {
  try {
    return coerceEntities(JSON.parse(raw));
  } catch {
    return [];
  }
}

const SCHEMA_VERSION = 4;

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS entries (
    key            TEXT PRIMARY KEY,
    category       TEXT NOT NULL,
    killer_feature TEXT NOT NULL,
    description    TEXT NOT NULL,
    entities       TEXT NOT NULL DEFAULT '[]',
    data_quality   TEXT,
    updated_at     INTEGER NOT NULL
  ) WITHOUT ROWID;

  CREATE TABLE IF NOT EXISTS embeddings (
    repo_id     TEXT PRIMARY KEY,
    vector      BLOB NOT NULL,
    embedder_id TEXT NOT NULL,
    updated_at  INTEGER NOT NULL
  ) WITHOUT ROWID;
`;

/** Unit-normalize a vector and pack it as a little-endian float32 BLOB.
 * Normalizing at write turns query-time cosine into a plain dot product. A
 * zero vector is stored as-is (degenerate; cosine against it is 0). */
function packVector(vector: number[]): Uint8Array {
  let norm = 0;
  for (const v of vector) norm += v * v;
  norm = Math.sqrt(norm);
  const f32 = new Float32Array(vector.length);
  if (norm > 0) {
    for (let i = 0; i < vector.length; i++) f32[i] = vector[i]! / norm;
  }
  return new Uint8Array(f32.buffer);
}

/** Decode a float32 BLOB back to a Float32Array (copy, so the backing
 * buffer is independent of SQLite's row memory). */
function unpackVector(blob: Uint8Array): Float32Array {
  return new Float32Array(blob.slice().buffer);
}

interface EntryRow {
  category: string;
  killer_feature: string;
  description: string;
  entities: string;
  data_quality: "full" | "sparse" | "truncated" | null;
}

type SaveParams = [string, string, string, string, string, string | null, number];

interface EmbeddingRow {
  vector: Uint8Array;
  embedder_id: string;
}

type EmbeddingSaveParams = [string, Uint8Array, string, number];

/** A repo's cached vector together with the node id it was stored under. */
export interface CachedEmbedding {
  repoId: string;
  vector: Float32Array;
}

export interface AnalysisCache {
  get(repoId: string, readme: string): AnalysisResult | null;
  saveEntry(repoId: string, readme: string, result: AnalysisResult): Promise<void>;
  /** Persist a per-repo embedding, normalized to unit length. Keyed by the
   * GitHub node id, alongside the repo's `entries` row. */
  saveEmbedding(repoId: string, vector: number[], embedderId: string): Promise<void>;
  /** Return the cached vector for `repoId` only when it was produced by the
   * active `embedderId`. A missing row or an `embedder_id` mismatch (which also
   * implies a dimension change) returns null — i.e. it is stale. */
  getEmbedding(repoId: string, embedderId: string): Float32Array | null;
  /** True when `repoId` has no fresh vector for `embedderId` and must be
   * (re)embedded. */
  needsEmbed(repoId: string, embedderId: string): boolean;
  /** All cached vectors produced by `embedderId`, for bulk retrieval preload. */
  allEmbeddings(embedderId: string): CachedEmbedding[];
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
    db.exec("DROP TABLE IF EXISTS embeddings;");
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
    "SELECT category, killer_feature, description, entities, data_quality FROM entries WHERE key = ?",
  );
  const upsertStmt: Statement<unknown, SaveParams> = db.query(
    "INSERT OR REPLACE INTO entries (key, category, killer_feature, description, entities, data_quality, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const countStmt: Statement<{ n: number }, []> = db.query("SELECT COUNT(*) AS n FROM entries");

  const selectEmbeddingStmt: Statement<EmbeddingRow, [string]> = db.query(
    "SELECT vector, embedder_id FROM embeddings WHERE repo_id = ?",
  );
  const upsertEmbeddingStmt: Statement<unknown, EmbeddingSaveParams> = db.query(
    "INSERT OR REPLACE INTO embeddings (repo_id, vector, embedder_id, updated_at) VALUES (?, ?, ?, ?)",
  );
  const selectAllEmbeddingsStmt: Statement<{ repo_id: string; vector: Uint8Array }, [string]> =
    db.query("SELECT repo_id, vector FROM embeddings WHERE embedder_id = ?");

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
        entities: parseEntitiesColumn(row.entities),
        dataQuality: row.data_quality ?? undefined,
      };
    },
    async saveEntry(repoId, readme, result) {
      upsertStmt.run(
        cacheKey(repoId, readme),
        result.category,
        result.killerFeature,
        result.description,
        JSON.stringify(result.entities ?? []),
        result.dataQuality ?? null,
        Date.now(),
      );
    },
    async saveEmbedding(repoId, vector, embedderId) {
      upsertEmbeddingStmt.run(repoId, packVector(vector), embedderId, Date.now());
    },
    getEmbedding(repoId, embedderId) {
      const row = selectEmbeddingStmt.get(repoId);
      if (!row || row.embedder_id !== embedderId) return null;
      return unpackVector(row.vector);
    },
    needsEmbed(repoId, embedderId) {
      const row = selectEmbeddingStmt.get(repoId);
      return !row || row.embedder_id !== embedderId;
    },
    allEmbeddings(embedderId) {
      return selectAllEmbeddingsStmt.all(embedderId).map((row) => ({
        repoId: row.repo_id,
        vector: unpackVector(row.vector),
      }));
    },
    get size() {
      return countStmt.get()?.n ?? 0;
    },
  };
}
