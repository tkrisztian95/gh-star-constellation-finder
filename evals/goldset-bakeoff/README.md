# Entity goldset bake-off

Build a **consensus golden set** of repo entities by having several frontier
models each do the extraction, then distilling their agreement. The goldset is
the ground truth future entity evals score against (LLM vs GLiNER vs hybrid).

## Why multiple models

No single model is ground truth. Three independent extractions (Claude, ChatGPT,
Gemini) → keep what the majority agree on → a defensible goldset that isn't biased
toward any one model (including the local one we're evaluating).

## Scope

120 repositories — the owner's real starred repos. **Readme-grade**: each repo's
input is `description + killerFeature + topics + README` (README truncated to
~1.5k chars; 115/120 have one). This matches what the extractors being scored
actually see, so the comparison is fair.

Because READMEs are large, the input is split into **4 self-contained batches**
(`input-batch-1.md` … `input-batch-4.md`, ~30 repos each). Each batch file
already includes the full prompt — paste one file = one model message.

## Workflow (manual — you run the models)

For **each** model (Claude, ChatGPT, Gemini) and **each** of the 4 batches:

1. Paste the whole `input-batch-N.md` into the model (it's self-contained).
2. Save the model's raw JSON reply to `outputs/<model>-N.json`, e.g.
   `outputs/claude-1.json`, `outputs/claude-2.json`, … `outputs/gemini-4.json`.
   Strip any prose or ``` fences — the file must be just the JSON object keyed by
   `"owner/name"`.

That's 4 batches × 3 models = 12 files. (Fewer models is fine — `distill.ts
claude chatgpt` adjusts the majority.)

3. **Distill:**
   ```bash
   bun run evals/goldset-bakeoff/distill.ts
   ```
   `distill` automatically **merges all of a model's batch files** (`claude-*.json`
   → one Claude result), votes entities agreed by ≥ majority of models, writes
   `goldset.json`, and prints an agreement report (per-model counts, pairwise
   Jaccard, consensus size). No manual stitching.

## Files

| File | What |
|------|------|
| `PROMPT.md` | the extraction instruction (also embedded in each batch) |
| `input-batch-{1..4}.md` | 120 repos in 4 self-contained, pasteable batches (readme-grade) |
| `repos.json` | the repo id list (manifest) |
| `outputs/<model>-<batch>.json` | **you create these** — each model+batch raw JSON reply |
| `distill.ts` | merge batches per model → consensus + report → `goldset.json` |
| `goldset.json` | generated consensus golden set |

## Output format (what each model must return, and what you save)

```json
{
  "owner/name": [
    { "name": "Python", "label": "LANGUAGE" },
    { "name": "Docker", "label": "TOOL" }
  ]
}
```

Labels: `LANGUAGE FRAMEWORK TOOL CONCEPT ORG PERSON DOMAIN`. The distiller runs
each model's output through a built-in filter (mirrors production `filterEntities`)
so license/badge/generic noise and bad labels are dropped before voting.

## Next

Once `goldset.json` exists, the entity eval scores each extractor
(LLM-full / GLiNER / GLiNER+alias / GLiNER+alias+LLM) against it for real
precision/recall — replacing the "agreement vs LLM-full" proxy used in the
spike.
