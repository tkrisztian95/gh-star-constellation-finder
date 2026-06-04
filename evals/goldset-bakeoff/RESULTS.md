# Entity extractor eval — results

Scored each extractor against the consensus `goldset.json` (120 repos, readme-grade),
via `scripts/scoreExtractors.ts`. Micro-averaged, local model = `llama3`.

| variant | P | R | F1 (name) | F1 (name+label) |
|---|---|---|---|---|
| **LLM** (default) | **0.77** | 0.50 | **0.61** | **0.42** |
| hybrid (GLiNER+alias+LLM-normalize) | 0.43 | 0.43 | 0.43 | 0.24 |
| GLiNER+alias | 0.25 | 0.40 | 0.31 | 0.18 |
| GLiNER | 0.24 | 0.39 | 0.30 | 0.16 |

## Verdict
- **LLM wins** — 2× GLiNER's F1, highest precision, graph-ready. Confirms the shipped default.
- GLiNER raw is noisy (P 0.24); alias barely helps; the LLM-normalize hybrid ~doubles GLiNER precision but stays below pure LLM.
- **Default stays LLM; GLiNER/hybrid remain opt-in** (value is speed/cost/local, not precision).

## Caveats
1. Goldset built by 3 LLMs → biased toward LLM-style extraction; GLiNER partly penalized for finding *different valid* entities.
2. Recall caps ~0.50 even for LLM — the 3-model consensus is richer than a single local llama3 run. A stronger extraction model (gemma4/cloud) or multi-pass would lift recall.
3. name+label F1 lower everywhere — label disagreements (e.g. Node.js TOOL vs FRAMEWORK).

## Reproduce
```bash
OLLAMA_MODEL=llama3 bun run scripts/scoreExtractors.ts \
  evals/goldset-bakeoff/goldset.json evals/goldset-bakeoff/corpus-readme.json <model.onnx>
```
`corpus-readme.json` = the 120 repos with README excerpts (the extractor input matching the goldset).
