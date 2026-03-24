## Context

The app calls OpenAI or Ollama for each starred repo. Currently there's no visibility into what's being sent, how long it takes, or how often the model returns unexpected output. Langfuse is a purpose-built LLM observability platform that supports local Docker deployment and a hosted SaaS option — the same SDK covers both via `LANGFUSE_BASE_URL`. Because the feature is dev-oriented, it must be strictly opt-in: if no Langfuse credentials are configured the app behaves exactly as today.

The two analyzers (`openaiAnalyzer.ts`, `ollamaAnalyzer.ts`) currently receive no shared state. A thin instrumentation layer needs to be threaded through `createAnalyzer` → each factory, without leaking Langfuse types into the public `Analyzer` interface.

## Goals / Non-Goals

**Goals:**
- Capture a Langfuse trace per `analyze()` call containing: system prompt, user message, model, backend, token usage (where available), latency, and the parsed response
- Flush traces on process exit so no data is silently dropped
- Zero overhead / zero side-effects when `LANGFUSE_PUBLIC_KEY` is absent
- Support both cloud Langfuse (default) and self-hosted via `LANGFUSE_BASE_URL`
- Document local Docker setup in README

**Non-Goals:**
- Tracing the consolidation prompt (`buildConsolidationPrompt`) — single call, lower value; can be added later
- Langfuse user/session grouping or custom scores
- Alerting or dashboards configuration

## Decisions

### 1. Null-object Langfuse client rather than conditional calls everywhere

**Decision**: Create a `createLangfuseClient()` helper that returns a real `Langfuse` instance when credentials exist, or `null` when they don't. Each analyzer accepts `langfuse: Langfuse | null` and guards with a single `if (langfuse)` block.

**Alternatives considered**:
- _Wrap every call site in try/catch_ — verbose, duplicates guard logic
- _Always initialise Langfuse but disable flushing_ — SDK still attempts network, making it non-zero cost

### 2. Pass client through factory arguments, not a global singleton

**Decision**: `createAnalyzer(backend?, langfuse?)` receives the client. `index.ts` constructs it once and passes it down.

**Alternatives considered**:
- _Module-level singleton_ — works but makes unit testing harder and hides the dependency
- _Environment variable read inside each analyzer_ — duplicates credential checking

### 3. Use `langfuse.generation()` (not `langfuse.trace()` + child span)

**Decision**: Each `analyze()` call is a single LLM generation; wrapping it directly as a `generation` keeps the trace hierarchy flat and matches Langfuse's recommended pattern for single-turn completions.

### 4. Graceful flush on exit

**Decision**: Register a `process.on('beforeExit')` handler that calls `await langfuse.flushAsync()`. This ensures the SDK's internal queue is drained before Node exits — relevant because each run is a CLI process, not a long-lived server.

## Risks / Trade-offs

- **Langfuse SDK adds ~400 KB to the bundle** → Mitigation: optional peer-dependency pattern; only imported when credentials present (dynamic import or top-level guarded by env check before require).
- **Token usage unavailable for Ollama** → Mitigation: omit the `usage` field in the Ollama trace; log a note in the README.
- **Langfuse SaaS outage blocks analysis** → Mitigation: SDK calls are fire-and-forget; errors in the trace client must not propagate to the analyzer return value. Wrap in try/catch.
- **Credentials accidentally committed** → Mitigation: add `LANGFUSE_*` vars to `.env.example` with placeholder values; add `.env` to `.gitignore` (verify it already is).

## Migration Plan

1. Add `langfuse` as an optional dependency in `package.json`
2. Create `src/ai/tracing.ts` — `createLangfuseClient()` and `flushTracing()` helpers
3. Update `createOpenAIAnalyzer` and `createOllamaAnalyzer` signatures to accept `langfuse`
4. Update `createAnalyzer` in `index.ts` to construct and pass the client
5. Register flush handler in `index.ts` (or at the CLI entry point)
6. Update `.env.example` and `README.md`

Rollback: remove the `langfuse` dep and revert the three changed files — no schema or data migrations required.

## Open Questions

- Should the consolidation prompt in the engine also be traced eventually? (Deferred — out of scope for this change.)
- Is there a preference between `langfuse` (Node SDK) and `langfuse-langchain`? The plain SDK is sufficient here since there's no LangChain usage.
