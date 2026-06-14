## 1. keep_alive residency (#36 — smallest, lowest risk)

- [x] 1.1 Add a configurable `keep_alive` (default `"10m"`) — env var (e.g. `OLLAMA_KEEP_ALIVE`) read in `src/ai/ollamaProvider.ts`.
- [x] 1.2 Include `keep_alive` in every `/api/chat` body (both `analyze()` and `complete()`).
- [x] 1.3 Document the env var in `.env.example`.
- [x] 1.4 Test: assert the request body carries the configured `keep_alive` (mock fetch).

## 2. Streaming complete() (#34)

- [x] 2.1 Extend the `complete()` seam in `src/ai/types.ts` to accept an optional opts bag `{ parent?, signal?, onProgress? }`; keep the 3-arg form working. Update OpenAI provider to honour `signal` at the fetch boundary and ignore `onProgress`.
- [x] 2.2 In `src/ai/ollamaProvider.ts`, switch `complete()` to `stream: true` and consume the NDJSON line stream, accumulating `message.content`.
- [x] 2.3 Emit `onProgress(tokenCount)` throttled every N≈16 tokens.
- [x] 2.4 Honour `signal`: pass to `fetch` and break the read loop on `signal.aborted`, rejecting with the same abort error shape `embed()` uses.
- [x] 2.5 Structural early-exit: stop reading once the outermost `{...}` is balanced (depth counter ignoring braces inside quoted strings); treat stream `done` as authoritative terminator.
- [x] 2.6 Replace the single-shot log with `{ tokensStreamed, doneReason, latencyMs }`.
- [x] 2.7 Wire `onSubStep`/abort through `consolidationCoordinator.ts` (map `onProgress` → "consolidating… N names mapped") and ensure the analyze loop's existing `AbortController` reaches `complete()`.
- [x] 2.8 Tests: progress callback fires, abort rejects mid-stream, early-exit resolves on balanced JSON, `complete()` still returns one string. Mock the streamed body at the fetch seam.

## 3. JSON-schema format toggle (#33 — rides on streaming, riskiest)

- [ ] 3.1 Add `OLLAMA_CONSOLIDATE_FORMAT=schema|none` (default `none`) config read in the provider.
- [ ] 3.2 When schema mode is on, send `format: { type: "object", additionalProperties: { type: ["string","null"] } }` on the consolidate call only.
- [ ] 3.3 Log `doneReason` + `evalCount` in both modes for A/B comparison.
- [ ] 3.4 Empty-content fallback: on empty `content` under schema mode, log and retry the same call once without `format`.
- [ ] 3.5 Tests: schema body sent only when toggled on; empty-content under schema mode triggers exactly one no-format retry; default path sends no `format`.

## 4. OpenAI prompt caching (#36 — best-effort, optional)

- [ ] 4.1 Detect whether the installed OpenAI SDK exposes a prompt-caching hint; gate behind that capability check.
- [ ] 4.2 When supported, mark the stable system/few-shot block of the analyze prompt as cacheable; leave per-repo content uncached.
- [ ] 4.3 When unsupported, no-op with no error; document the outcome (verified no-op is an acceptable landing state).
- [ ] 4.4 Test: caching hint applied when the capability is present (mocked), skipped cleanly when absent.

## 5. Quality gates & parity

- [ ] 5.1 Confirm headless parity — `--analyze-only` and TUI produce identical analyze/consolidate output (perf only, no delta).
- [ ] 5.2 Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` — all clean.
- [ ] 5.3 Verify Ollama-only telemetry fields branch on backend (no token counts guessed for OpenAI).
