import { filterEntities, type Entity, type EntityLabel } from "./entityFilter.js";
import type { EntityExtractor, EntityExtractionInput } from "./entityExtractor.js";
import type { LangfuseParent } from "./tracing.js";

/**
 * Deterministic canonicalization of known entity-name variants. Cheap, instant,
 * and predictable — handles the common 80% (TS -> TypeScript, k8s -> Kubernetes)
 * before any LLM pass. It can only fix variants it knows; the unbounded long
 * tail (arbitrary GLiNER phrases) is left to the LLM normalizer downstream.
 *
 * Map key = lowercased surface form; value = canonical name (+ optional label
 * override when the variant strongly implies a type).
 */
const ALIASES: Record<string, { name: string; label?: EntityLabel }> = {
  ts: { name: "TypeScript", label: "LANGUAGE" },
  "typescript-based": { name: "TypeScript", label: "LANGUAGE" },
  js: { name: "JavaScript", label: "LANGUAGE" },
  javascript: { name: "JavaScript", label: "LANGUAGE" },
  node: { name: "Node.js", label: "TOOL" },
  nodejs: { name: "Node.js", label: "TOOL" },
  "node.js": { name: "Node.js", label: "TOOL" },
  py: { name: "Python", label: "LANGUAGE" },
  golang: { name: "Go", label: "LANGUAGE" },
  "go-lang": { name: "Go", label: "LANGUAGE" },
  k8s: { name: "Kubernetes", label: "TOOL" },
  kube: { name: "Kubernetes", label: "TOOL" },
  postgres: { name: "PostgreSQL", label: "TOOL" },
  psql: { name: "PostgreSQL", label: "TOOL" },
  gh: { name: "GitHub", label: "ORG" },
  openjdk: { name: "OpenJDK", label: "TOOL" },
  jdk: { name: "OpenJDK", label: "TOOL" },
  dockerfile: { name: "Docker", label: "TOOL" },
  "java.awt": { name: "Java", label: "LANGUAGE" },
  "java-based": { name: "Java", label: "LANGUAGE" },
};

/** Rewrite known name variants to their canonical form, then re-filter/dedupe. */
export function aliasNormalize(entities: Entity[]): Entity[] {
  const mapped = entities.map((e) => {
    const hit = ALIASES[e.name.trim().toLowerCase()];
    if (!hit) return e;
    return { name: hit.name, label: hit.label ?? e.label };
  });
  return filterEntities(mapped);
}

/** Composable seam wrapper: runs a base extractor, then the alias pass. */
export class AliasNormalizingExtractor implements EntityExtractor {
  constructor(private readonly base: EntityExtractor) {}
  async extract(input: EntityExtractionInput, parent?: LangfuseParent | null): Promise<Entity[]> {
    return aliasNormalize(await this.base.extract(input, parent));
  }
}
