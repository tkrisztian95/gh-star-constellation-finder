Tracks #34, #33, #36

## Why

The local-Ollama backend — the recommended default in `--help` — has two avoidable pain points on the consolidation/analyze hot paths, plus an unused cheap latency win on both backends:

- **Frozen UI (#34).** `complete()` uses `stream: false`, so a 40–160 s consolidation call blocks the TUI with no progress and no working ESC mid-call.
- **Fragile JSON (#33).** The consolidate path uses no Ollama `format` and relies on a regex extractor; a JSON-schema `format` gives the model a concrete target and may raise success rate — if it doesn't reintroduce the empty-content regression from #28/#29.
- **Cold reloads + re-tokenization (#36).** `analyze()` fires 100–250 calls/run with an identical system prompt; Ollama can evict the model between calls and OpenAI re-bills the stable prompt every call.

These are three independent wins on the same provider seam (`src/ai/`). Bundling shares the provider-request and logging plumbing; each lands as its own isolable task section so partial delivery is fine.

## What Changes

- **#34 — Streaming `complete()`.** Switch Ollama `complete()` to `stream: true`, parse the NDJSON token stream, emit `onSubStep` progress every N tokens, honour `AbortSignal` mid-stream (ESC cancels the in-flight call), and early-abort once the JSON is structurally complete. `complete()`'s contract is unchanged — still resolves to a single `content` string. Per-call log records tokens streamed, `done_reason`, latency.
- **#33 — Ollama JSON-schema format mode (toggle).** Behind an env/flag toggle, send `format: { type: "object", additionalProperties: { type: ["string","null"] } }` on the consolidate call. Log `doneReason` + `evalCount` in both modes for A/B comparison; fall back to no-format mode if schema-mode regresses for the user's model.
- **#36 — Hot-path caching/residency.** Pass a configurable `keep_alive` (default `"10m"`) to Ollama `/api/chat` so the model stays resident across the analyze batch and consolidate calls. For OpenAI, mark the stable analyze prompt parts as cacheable (**best-effort, optional** — SDK support uncertain). Both are silent no-ops where unsupported.

### Breaking changes

None. `complete()` and `analyze()` keep their signatures and return shapes. The per-call Ollama log shape changes (adds streamed-token / `done_reason` fields) — file-log only, not a frozen contract.

## Capabilities

### New Capabilities

- `ollama-streaming-complete`: streaming `complete()` with token progress, mid-stream abort, and structural early-exit (#34).
- `ollama-consolidate-format-mode`: toggleable JSON-schema `format` on the consolidate call with no-format fallback (#33).
- `provider-hotpath-caching`: Ollama `keep_alive` residency and best-effort OpenAI prompt caching on the analyze hot path (#36).

### Modified Capabilities

<!-- none -->

## Impact

- `src/ai/ollamaProvider.ts` — streaming request + NDJSON parse (#34), `format` toggle (#33), `keep_alive` option (#36).
- `src/ai/openaiProvider.ts` — best-effort cacheable prompt marking (#36).
- `src/ai/types.ts` / provider seam — `complete()` may accept an `AbortSignal` + `onSubStep` (kept backward-compatible; orchestration still goes through the abstraction, no direct SDK calls).
- `src/orchestration/consolidationCoordinator.ts`, `src/orchestration/analysis.ts` — wire `onSubStep` progress + abort signal; behaviour identical in TUI and `--analyze-only` (headless parity).
- Config surface — env vars/flags for the format toggle and `keep_alive` duration.
- Telemetry — token-count fields branch on backend (Ollama-only caveat).
- Ships as a v0.4.x minor (new capabilities, opt-in toggles).
