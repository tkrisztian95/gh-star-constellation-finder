## Why

During development it's hard to inspect what prompts are sent to AI backends (OpenAI or Ollama), see token usage, latency, and iterate on prompt quality without adding debug logging everywhere. A dedicated observability layer — Langfuse — gives a structured trace per repo analysis call, works locally via Docker or connects to the hosted service via env vars.

## What Changes

- Wrap both `openaiAnalyzer` and `ollamaAnalyzer` calls with Langfuse trace/generation spans
- Initialise a Langfuse client conditionally (only when credentials are present, so the tool stays usable without it)
- Capture: system prompt, user message, model name, token usage, latency, and the parsed response
- Add `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` env var support (the last one defaults to the Langfuse cloud URL but can point to a self-hosted instance)
- Document how to spin up Langfuse locally with Docker in the README

## Capabilities

### New Capabilities

- `prompt-tracing`: Observability wrapper around AI analyzer calls — captures prompts, responses, token counts, and latency as Langfuse traces

### Modified Capabilities

- `ai-analysis`: Analyzers gain optional Langfuse instrumentation without changing their public interface or behaviour when tracing is disabled

## Impact

- `src/ai/openaiAnalyzer.ts` — wrap `chat.completions.create` call in a Langfuse generation
- `src/ai/ollamaAnalyzer.ts` — same
- `src/ai/index.ts` — create and pass a shared Langfuse client instance (or `null`) to analyzers
- `package.json` / `bun.lockb` — new optional dependency: `langfuse`
- `.env.example` / `README.md` — document new env vars and local Docker setup
