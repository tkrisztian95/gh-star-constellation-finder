import type { AIProvider } from "./types.js";
import type { LangfuseParent } from "./tracing.js";
import { coerceEntities, type Entity } from "./entityFilter.js";

/**
 * Entity extraction is a separate seam from analysis. Analysis (category /
 * killerFeature / description) is a generative/judgment task; entity extraction
 * is a span-extraction task. Keeping them apart lets the analysis prompt stay
 * focused and lets the entity engine be swapped (LLM today; a local zero-shot
 * NER like GLiNER or a dictionary matcher later) and measured independently.
 */
export interface EntityExtractionInput {
  owner: string;
  name: string;
  description: string;
  language: string | null;
  topics: string[];
  readme: string;
}

export interface EntityExtractor {
  extract(input: EntityExtractionInput, parent?: LangfuseParent | null): Promise<Entity[]>;
}

const ENTITY_SYSTEM = `You extract concrete technical entities from a software project's text.
Return ONLY a JSON object: {"entities": [{"name": "...", "label": "..."}]}.

Each entity has a "name" and one "label" from:
- LANGUAGE (programming languages, e.g. TypeScript, Rust)
- FRAMEWORK (frameworks/libraries, e.g. React, Django)
- TOOL (tools, platforms, runtimes, dependencies, e.g. Docker, Vite, controller-runtime)
- CONCEPT (techniques/paradigms, e.g. OAuth, HNSW, structured generation)
- ORG (companies, projects, foundations)
- PERSON (named people)
- DOMAIN (problem domains, e.g. observability, machine learning)

RULES:
- Extract only entities supported by the text (especially the README).
- Use the canonical name (e.g. "TypeScript" not "TS", "Kubernetes" not "k8s").
- Prefer specific entities a developer would search for.
- DO NOT emit licenses (MIT, Apache 2.0), badges, shields, CI/coverage services, generic words ("library", "tool", "API", "web"), or URLs.
- No prose, no markdown, no code fences — only the JSON object.`;

/**
 * Where the LLM reads entities from:
 * - "readme" (default): full README + metadata — richest (the eval showed +68%
 *   unique entities), at higher token cost.
 * - "description": description + killerFeature + topics only — lean, fast,
 *   cheap; also the automatic fallback when no README is available.
 */
export type EntitySource = "readme" | "description";

export function buildEntityPrompt(
  input: EntityExtractionInput,
  source: EntitySource = "readme",
): string {
  const lines = [
    ENTITY_SYSTEM,
    "",
    `Repository: ${input.owner}/${input.name}`,
    `Description: ${input.description || "(none)"}`,
    `Language: ${input.language ?? "(unknown)"}`,
    `Topics: ${input.topics.length > 0 ? input.topics.join(", ") : "(none)"}`,
  ];
  if (source === "readme") {
    const readme = input.readme?.trim() ?? "";
    lines.push("", readme.length === 0 ? "README: (absent)" : `README:\n${readme}`);
  }
  lines.push("", 'Respond ONLY with {"entities": [{"name","label"}]}.');
  return lines.join("\n");
}

/** Default extractor: prompts the configured AIProvider via its `complete()` seam. */
export class LlmEntityExtractor implements EntityExtractor {
  constructor(
    private readonly provider: AIProvider,
    private readonly source: EntitySource = "readme",
  ) {}

  async extract(input: EntityExtractionInput, parent?: LangfuseParent | null): Promise<Entity[]> {
    let raw: string;
    try {
      raw = await this.provider.complete(
        buildEntityPrompt(input, this.source),
        "entity-extraction",
        parent,
      );
    } catch {
      return [];
    }
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return [];
    try {
      const parsed = JSON.parse(match[0]) as { entities?: unknown };
      return coerceEntities(parsed.entities);
    } catch {
      return [];
    }
  }
}
