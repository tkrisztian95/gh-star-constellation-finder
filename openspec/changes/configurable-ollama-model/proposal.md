## Why

The Ollama model used for analysis is hardcoded to `llama3` with no way to override it. Users running different local models (e.g., `mistral`, `gemma`, `codellama`) cannot use the analyzer without modifying source code.

## What Changes

- Add `OLLAMA_MODEL` environment variable support to configure the model at runtime
- Default to `llama3` when `OLLAMA_MODEL` is not set (preserves existing behavior)
- Update `.env.example` to document the new variable

## Capabilities

### New Capabilities

- `ollama-model-config`: Ability to configure the Ollama model via environment variable `OLLAMA_MODEL`

### Modified Capabilities

<!-- None — no existing spec-level requirements are changing -->

## Impact

- `src/ai/ollamaAnalyzer.ts`: read `OLLAMA_MODEL` env var and pass to model parameter
- `.env.example`: add `OLLAMA_MODEL=llama3` example entry
- No breaking changes — default behavior is preserved
