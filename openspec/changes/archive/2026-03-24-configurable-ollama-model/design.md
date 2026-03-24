## Context

`createOllamaAnalyzer` in `src/ai/ollamaAnalyzer.ts` defaults the model to `llama3` and is always called with no arguments from `src/ai/index.ts`. Users running smaller or different local models — e.g., `qwen2.5:7b`, `phi3:mini`, `llama3:8b` — cannot switch without touching source code.

`OLLAMA_HOST` is already read from the environment, establishing the pattern for runtime configuration.

## Goals / Non-Goals

**Goals:**
- Allow runtime model selection via `OLLAMA_MODEL` env var
- Default to `llama3` when unset (no behavior change for existing users)
- Document the variable in `.env.example`

**Non-Goals:**
- Validating that the requested model is available in Ollama (fail at inference time as today)
- CLI flag or UI to change the model
- Supporting multiple models simultaneously

## Decisions

**Read `OLLAMA_MODEL` in `ollamaAnalyzer.ts`, not in `index.ts`**

The env var is an implementation detail of the Ollama backend. Reading it close to where `OLLAMA_HOST` is already read keeps the pattern consistent and avoids leaking Ollama-specific config into the generic `createAnalyzer` factory.

```ts
// Before
export function createOllamaAnalyzer(model = 'llama3'): Analyzer {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';

// After
export function createOllamaAnalyzer(): Analyzer {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'llama3';
```

The `model` parameter can be kept (or removed) — keeping it with a default of `undefined` allows callers to still override programmatically if needed.

## Risks / Trade-offs

- **Typo in model name** → Ollama returns an HTTP error; existing error handling already logs and returns `analysis-failed`. No new risk.
- **Env var added but model not pulled** → Same failure path. Users are expected to manage their local Ollama models.
