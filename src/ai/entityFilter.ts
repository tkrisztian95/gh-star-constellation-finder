import { z } from "zod";

/** Technical-entity label set (proven in the ner-structured prototype). */
export const entityLabelSchema = z.enum([
  "LANGUAGE",
  "FRAMEWORK",
  "TOOL",
  "CONCEPT",
  "ORG",
  "PERSON",
  "DOMAIN",
]);
export type EntityLabel = z.infer<typeof entityLabelSchema>;

export const entitySchema = z.object({
  name: z.string().min(1),
  label: entityLabelSchema,
});
export type Entity = z.infer<typeof entitySchema>;

// Noise the model emits from README badges, license blocks, and CI shields, plus
// words too generic to link repos. License/badge terms came straight from the
// A/B experiment on real stars.
const STOPWORDS = new Set([
  // licenses
  "license",
  "licence",
  "apache",
  "apache 2.0",
  "apache license",
  "apache license 2.0",
  "mit",
  "mit license",
  "gpl",
  "gplv2",
  "gplv3",
  "agpl",
  "lgpl",
  "bsd",
  "mpl",
  "isc",
  "unlicense",
  "creative commons",
  "cc-by",
  "cc by",
  "creative commons noderivatives 4.0 license",
  "copyright",
  // badges / CI noise
  "badge",
  "badges",
  "shield",
  "shields",
  "shields.io",
  "codecov",
  "coveralls",
  "ci",
  "cd",
  "ci/cd",
  "build status",
  "github",
  "github actions",
  // too generic to link on
  "library",
  "framework",
  "tool",
  "toolkit",
  "software",
  "application",
  "app",
  "api",
  "sdk",
  "open source",
  "open-source",
  "cross-platform",
  "web",
  "frontend",
  "backend",
  "client",
  "server",
  "platform",
  "system",
  "data",
  "code",
]);

const MAX_NAME_LEN = 40;

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/**
 * Remove non-technical noise (licenses, badges, CI, generic words, URLs,
 * empty/over-long names) and de-duplicate by normalized (name, label).
 * Deterministic — never calls the model.
 */
export function filterEntities(entities: Entity[]): Entity[] {
  const seen = new Set<string>();
  const out: Entity[] = [];
  for (const e of entities) {
    const name = e.name.trim();
    if (!name || name.length > MAX_NAME_LEN) continue;
    const key = norm(name);
    if (STOPWORDS.has(key)) continue;
    if (/^https?:\/\//.test(name)) continue; // badge / shield URLs
    const dedupeKey = `${key}|${e.label}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    out.push({ name, label: e.label });
  }
  return out;
}

/**
 * Coerce an unknown JSON value (the model's `entities` field) into a clean,
 * validated, filtered Entity[]. Invalid entries are dropped, never thrown.
 */
export function coerceEntities(raw: unknown): Entity[] {
  if (!Array.isArray(raw)) return [];
  const valid: Entity[] = [];
  for (const item of raw) {
    const parsed = entitySchema.safeParse(item);
    if (parsed.success) valid.push(parsed.data);
  }
  return filterEntities(valid);
}
