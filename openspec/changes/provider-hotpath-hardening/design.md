## Context

All three issues sit on the `src/ai/` provider seam:

- `complete()` (`src/ai/types.ts:81`) is `(prompt, generationName, parent?)` — no `AbortSignal`, no progress callback. Ollama's impl (`src/ai/ollamaProvider.ts:107`) posts `/api/chat` with `stream: false` and `options: { num_ctx, num_predict, temperature }`, then regex-extracts the JSON.
- `embed()` already takes `signal?: AbortSignal` (`types.ts:84`), and the analyze loop already owns an `AbortController` (`src/orchestration/analysis.ts:123`). So abort plumbing exists — `complete()` just isn't wired to it yet.
- `consolidateCategories` already threads `onSubStep?(message)` (`consolidationCoordinator.ts:231`) and emits a single "Consolidating categories…" line — the natural sink for streaming progress.
- The empty-content regression from `format: "json"` (#28, rolled back in #29) is the live hazard for #33.

## Goals / Non-Goals

**Goals:**
- ESC cancels an in-flight Ollama `complete()` (#34); live token progress instead of a frozen screen.
- A measurable, reversible A/B path for JSON-schema `format` on consolidate (#33).
- Model residency across the analyze batch via `keep_alive` (#36).
- Each issue independently landable; `complete()`/`analyze()` contracts preserved; headless parity intact.

**Non-Goals:**
- No streaming for OpenAI `complete()` (it's already fast; out of scope).
- No guaranteed OpenAI prompt-caching — best-effort only (see risks).
- No change to the regex JSON extractor's fallback role (it stays as the no-format safety net).

## Decisions

1. **Extend `complete()` with an options bag, not positional params.** New shape: `complete(prompt, generationName, opts?: { parent?, signal?, onProgress? })`. Existing 3-arg callers keep working (opts optional). `onProgress?(tokenCount)` lets the Ollama impl report progress; the coordinator maps it to `onSubStep` ("consolidating… N names mapped"). OpenAI ignores `onProgress` and aborts on `signal` at the fetch boundary. This keeps orchestration behind the abstraction (no SDK leakage) and is backward-compatible.
2. **NDJSON streaming in Ollama `complete()` (#34).** `stream: true`, read the response body as a line stream, accumulate `message.content` chunks. Emit `onProgress` every N tokens (N≈16). Pass `signal` to `fetch` and break the read loop on `signal.aborted` (reject with the same abort error `embed()` uses). Early-exit: once accumulated content has a balanced top-level `{...}`, stop reading and resolve. Final log: `{ tokensStreamed, doneReason, latencyMs }` replacing the single-shot log.
3. **Schema `format` behind a toggle (#33).** An env var (e.g. `OLLAMA_CONSOLIDATE_FORMAT=schema|none`, default `none`) selects whether the consolidate call sends the JSON-schema `format`. Log `doneReason` + `evalCount` in both modes. If a schema-mode call returns empty content, log it and **fall back to a no-format retry of the same call** before surfacing failure — so a regressing model degrades to today's behaviour automatically, not just on the next run.
4. **`keep_alive` + OpenAI caching (#36).** Add a configurable `keep_alive` (default `"10m"`) to every Ollama `/api/chat` body (analyze + complete). For OpenAI, mark the stable system/few-shot block as cacheable **if** the installed SDK exposes the hint; otherwise no-op. Gate the OpenAI part behind a capability check so an unsupported SDK version is a silent skip, never an error.
5. **Sequencing within the change.** Land in order: #36 `keep_alive` (smallest, lowest-risk) → #34 streaming (enables mid-stream abort) → #33 format toggle (rides on the streaming parser, riskiest). Each is its own task section + commit.

## Risks / Trade-offs

- **#33 ↔ #34 interplay.** Schema-constrained sampling + streaming is untested on Gemma and previously emptied `content` (#28/#29). Mitigation: #33 is toggle-default-off with an automatic no-format fallback, and lands *after* #34 so the streaming parser is already proven on the no-format path. If schema-mode can't beat the `temperature:0` baseline, #33 closes wontfix without affecting #34/#36.
- **OpenAI prompt caching uncertainty (#36).** The issue itself hedges on SDK support. Treated as best-effort/optional: if the hint isn't available it's a no-op, and the task is allowed to land as "verified no-op + documented" rather than a guaranteed cost cut. The `keep_alive` half of #36 is the solid win.
- **Early-abort false positive (#34).** A balanced `{...}` could appear inside a string value before the real end. Mitigation: only treat the outermost brace pair as complete (depth counter that ignores braces inside quoted strings), and still honour `done` from the stream as the authoritative terminator.
- **Progress noise.** Emitting `onSubStep` too often could thrash the TUI. Mitigation: throttle to every N tokens, and the message is a single replaceable line (already how `onSubStep` renders).
- **Ollama token counts only.** `evalCount`/`tokensStreamed` exist on Ollama responses, not OpenAI — telemetry fields branch on backend per the existing caveat.
