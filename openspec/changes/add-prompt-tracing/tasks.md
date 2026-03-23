## 1. Dependencies

- [ ] 1.1 Add `langfuse` to `package.json` dependencies and install it (`bun add langfuse`)

## 2. Tracing Helper Module

- [ ] 2.1 Create `src/ai/tracing.ts` with a `createLangfuseClient()` function that returns `Langfuse | null` based on env vars `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and optionally `LANGFUSE_BASE_URL`
- [ ] 2.2 Add a `flushTracing(langfuse: Langfuse | null)` helper in `src/ai/tracing.ts` that calls `langfuse.flushAsync()` when non-null

## 3. Instrument OpenAI Analyzer

- [ ] 3.1 Update `createOpenAIAnalyzer(langfuse?: Langfuse | null)` signature in `src/ai/openaiAnalyzer.ts`
- [ ] 3.2 Before the `chat.completions.create` call, start a Langfuse generation with model, system prompt, and user message (guard with `if (langfuse)`)
- [ ] 3.3 After the call, end the generation with the raw response content and token usage from `completion.usage`
- [ ] 3.4 Wrap the Langfuse calls in try/catch so tracing errors never surface to the caller

## 4. Instrument Ollama Analyzer

- [ ] 4.1 Update `createOllamaAnalyzer(model, langfuse?: Langfuse | null)` signature in `src/ai/ollamaAnalyzer.ts`
- [ ] 4.2 Start a Langfuse generation before the `fetch` call with model, system prompt, and user message (guard with `if (langfuse)`)
- [ ] 4.3 End the generation with the raw response content (no usage field for Ollama)
- [ ] 4.4 Wrap the Langfuse calls in try/catch

## 5. Wire Up in Analyzer Factory

- [ ] 5.1 Update `createAnalyzer(backend?, langfuse?)` in `src/ai/index.ts` to accept and pass the Langfuse client to each analyzer factory
- [ ] 5.2 In the CLI entry point (or wherever `createAnalyzer` is called), construct the Langfuse client via `createLangfuseClient()` and pass it in
- [ ] 5.3 Register a `process.on('beforeExit', ...)` handler that calls `flushTracing(langfuse)` to drain the SDK queue before exit

## 6. Documentation

- [ ] 6.1 Add `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, and `LANGFUSE_BASE_URL` entries to `.env.example` with placeholder values and comments
- [ ] 6.2 Update `README.md` with a "Prompt Tracing (optional)" section explaining: env vars, cloud setup link, and local Docker command (`docker run ...` for Langfuse)
