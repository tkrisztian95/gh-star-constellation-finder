# Entity goldset bake-off

Build a **consensus golden set** of repo entities by having several frontier
models each do the extraction, then distilling their agreement. The goldset is
the ground truth future entity evals score against (LLM vs GLiNER vs hybrid).

## Why multiple models

No single model is ground truth. Three independent extractions (Claude, ChatGPT,
Gemini) → keep what the majority agree on → a defensible goldset that isn't biased
toward any one model (including the local one we're evaluating).

## Scope

120 repositories — the owner's real starred repos (the corpus we already
analysed). Input is `description + killerFeature + topics`. READMEs are **not**
included at this scale: they don't fit a single manual paste and aren't available
locally for all 120 (a GitHub re-export is needed). So this goldset is
**description-grade**. When READMEs are re-exported, regenerate `input.md` with
them for a readme-grade goldset; score extractors on the matching input.

## Workflow (manual — you run the models)

1. **Build the prompt input.** Paste the contents of [`PROMPT.md`](./PROMPT.md)
   then [`input.md`](./input.md) into each model, in one message:
   - Claude (claude.ai), ChatGPT, and Gemini.
2. **Save each model's reply** (the raw JSON object) to:
   - `outputs/claude.json`
   - `outputs/chatgpt.json`
   - `outputs/gemini.json`
   Each file must be the JSON object keyed by `"owner/name"` — strip any prose or
   code fences the model adds.
3. **Distill:**
   ```bash
   bun run evals/goldset-bakeoff/distill.ts
   ```
   Produces `goldset.json` (entities agreed by ≥ majority of models) and prints
   an agreement report (per-model counts, pairwise Jaccard, consensus size).

You can run with however many models you have — `distill.ts claude chatgpt`
works with two; majority adjusts.

## Files

| File | What |
|------|------|
| `PROMPT.md` | model-agnostic extraction instruction + output format |
| `input.md` | 120 repositories (description + killerFeature + topics), ready to paste in one message |
| `repos.json` | the repo id list (manifest) |
| `outputs/<model>.json` | **you create these** — each model's raw JSON reply |
| `distill.ts` | consensus + agreement report → `goldset.json` |
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
each model's output through the same `filterEntities` used in production, so
license/badge/generic noise is dropped before voting.

## Next

Once `goldset.json` exists, the entity eval scores each extractor
(LLM-full / GLiNER / GLiNER+alias / GLiNER+alias+LLM) against it for real
precision/recall — replacing the "agreement vs LLM-full" proxy used in the
spike.
