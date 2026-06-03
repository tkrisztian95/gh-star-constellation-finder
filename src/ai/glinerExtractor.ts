// Type-only import is erased at compile time, so it triggers NO runtime load.
// The actual gliner + onnxruntime-node modules load lazily in init() (dynamic
// import), and are optionalDependencies — nothing is pulled unless GLiNER is
// actually selected. Default extraction is the LLM; this is opt-in.
import type { Gliner } from "gliner/node";

import { filterEntities, type Entity, type EntityLabel } from "./entityFilter.js";
import type { EntityExtractor, EntityExtractionInput } from "./entityExtractor.js";

/**
 * Local, zero-shot entity extraction via GLiNER (ONNX, no Python, no LLM).
 * Alternative to LlmEntityExtractor — same EntityExtractor seam, so it can be
 * swapped in and measured against the LLM on the same labels.
 *
 * GLiNER finds spans for free-form *type* names we give it; we ask for natural
 * phrasings and map the results back to our EntityLabel enum.
 */
const TYPE_TO_LABEL: Record<string, EntityLabel> = {
  "programming language": "LANGUAGE",
  "framework or library": "FRAMEWORK",
  "software tool": "TOOL",
  "technical concept": "CONCEPT",
  organization: "ORG",
  person: "PERSON",
  "problem domain": "DOMAIN",
};
const GLINER_TYPES = Object.keys(TYPE_TO_LABEL);

export interface GlinerOptions {
  tokenizerPath?: string;
  modelPath: string; // local path to model.onnx
  threshold?: number;
  maxChars?: number;
}

export class GlinerExtractor implements EntityExtractor {
  private gliner: Gliner | null = null;
  private ready: Promise<void> | null = null;
  private readonly opts: GlinerOptions;
  private readonly threshold: number;
  private readonly maxChars: number;

  constructor(opts: GlinerOptions) {
    this.opts = opts;
    this.threshold = opts.threshold ?? 0.4;
    this.maxChars = opts.maxChars ?? 4000;
  }

  private async load(): Promise<void> {
    // Dynamic import: gliner + onnxruntime-node are optionalDependencies and
    // load only here, the first time GLiNER is actually used.
    const { Gliner } = await import("gliner/node");
    this.gliner = new Gliner({
      tokenizerPath: this.opts.tokenizerPath ?? "onnx-community/gliner_small-v2",
      onnxSettings: { modelPath: this.opts.modelPath, executionProvider: "cpu" },
      maxWidth: 12,
      modelType: "span-level",
    });
    await this.gliner.initialize();
  }

  private init(): Promise<void> {
    if (!this.ready) this.ready = this.load();
    return this.ready;
  }

  async extract(input: EntityExtractionInput): Promise<Entity[]> {
    await this.init();
    if (!this.gliner) return [];
    const text = [input.description, input.readme]
      .filter(Boolean)
      .join("\n")
      .slice(0, this.maxChars);
    if (!text.trim()) return [];

    const results = await this.gliner.inference({
      texts: [text],
      entities: GLINER_TYPES,
      threshold: this.threshold,
      flatNer: false,
    });

    const raw: Entity[] = (results[0] ?? [])
      .map((r) => {
        const label = TYPE_TO_LABEL[r.label.toLowerCase()];
        return label ? { name: r.spanText, label } : null;
      })
      .filter((e): e is Entity => e !== null);

    return filterEntities(raw);
  }
}
