import type { AIProvider } from "./types.js";
import type { LangfuseParent } from "./tracing.js";
import { coerceEntities, type Entity } from "./entityFilter.js";
import type { EntityExtractor, EntityExtractionInput } from "./entityExtractor.js";

/**
 * Two-stage extraction: a fast/local base extractor (e.g. GLiNER) reads the
 * whole README and proposes candidate entities; the LLM then normalizes only
 * that short candidate LIST — not the README. The LLM does what it is best at
 * (canonical names, correct labels, dropping noise) on a tiny input, so the
 * expensive model never processes the full text.
 */
function buildNormalizePrompt(repo: string, candidates: Entity[]): string {
  const list = candidates.map((e) => `- ${e.name} (${e.label})`).join("\n");
  return `Below is a noisy list of technical entities auto-extracted from the repository "${repo}".

Clean the list. STRICT RULES:
- ONLY transform entities that appear in CANDIDATES. NEVER add a technology that is not in the list.
- Shorten each to its canonical product name; drop descriptive words around it (a phrase like "X-based driver API" becomes "X" or is dropped if not a real product).
- Set the correct label: one of LANGUAGE, FRAMEWORK, TOOL, CONCEPT, ORG, PERSON, DOMAIN.
- Remove non-technical noise (generic words, roles like "developers"), licenses, and duplicates.

CANDIDATES:
${list || "(none)"}

Output ONLY entities derived from CANDIDATES, as JSON: {"entities": [{"name": "...", "label": "..."}]}. No prose, no examples, no invented entries.`;
}

export class LlmNormalizingExtractor implements EntityExtractor {
  constructor(
    private readonly base: EntityExtractor,
    private readonly provider: AIProvider,
  ) {}

  async extract(input: EntityExtractionInput, parent?: LangfuseParent | null): Promise<Entity[]> {
    const candidates = await this.base.extract(input, parent);
    if (candidates.length === 0) return [];

    let raw: string;
    try {
      raw = await this.provider.complete(
        buildNormalizePrompt(`${input.owner}/${input.name}`, candidates),
        "entity-normalize",
        parent,
      );
    } catch {
      return candidates; // fall back to the un-normalized candidates
    }
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return candidates;
    try {
      const parsed = JSON.parse(match[0]) as { entities?: unknown };
      const normalized = coerceEntities(parsed.entities);
      return normalized.length > 0 ? normalized : candidates;
    } catch {
      return candidates;
    }
  }
}
