## Context

The CLI currently requires an interactive terminal to display its Ink-based TUI. There is no way to get analysis results programmatically. The entire flow (auth → fetch → analyze → consolidate → suggest → review → apply) is wired through a single React component tree driven by promises.

Adding `--analyze-only` needs to short-circuit that flow early — before the TUI is ever rendered — and print structured JSON to stdout.

## Goals / Non-Goals

**Goals:**
- Add `--analyze-only` boolean flag parsed from CLI args
- Run the full read pipeline (fetch repos, fetch READMEs, AI analysis, consolidation, suggestion generation) without rendering any Ink components
- Emit a single JSON document to stdout and exit 0
- Honour existing flags (`--backend`, `--limit`, `--concurrency`) in this mode

**Non-Goals:**
- Interactive output or progress indicators in `--analyze-only` mode (stdout must be clean JSON)
- Writing any data back to GitHub
- Changing the JSON shape of internal types (use existing `AnalyzedRepo` and `Suggestion` shapes)
- A dedicated strategy selector in this mode — default to `"balanced"` strategy

## Decisions

### 1. Early branch in `main()`, no TUI rendered
After `parseArgs()`, if `analyzeOnly` is `true`, jump directly to a `runAnalyzeOnly()` helper that runs the pipeline and prints JSON. `render(<ReactiveApp />)` is never called.

**Alternative considered**: render a minimal Ink component that prints JSON then unmounts. Rejected — adds unnecessary complexity and risks stdout pollution from Ink escape codes.

### 2. Strategy fixed to `"balanced"` in analyze-only mode
The strategy picker is a TUI interaction. For headless use, default to `"balanced"`.

**Alternative considered**: allow `--strategy` flag. Left as a future enhancement; not needed for the core use case.

### 3. JSON schema
```ts
{
  runId: string,               // from generateSessionId() in src/ai/tracing.ts
  analyzedRepos: Array<{
    repo: { id, name, owner, description, language, topics, isArchived },
    analysis: { category, killerFeature, dataQuality }
  }>,
  suggestions: Array<Suggestion>  // existing Suggestion type
}
```
`generateSessionId()` is already imported for Langfuse tracing; reuse it here so the run can be correlated across logs or future tracing integrations. No new types introduced.

### 4. No Langfuse tracing in analyze-only mode
Tracing can emit stderr noise and requires flushing. Skip it to keep the mode clean and fast.

**Alternative considered**: keep tracing on. Rejected — stdout must be clean JSON; mixing trace noise is unexpected for scripting use cases.

## Risks / Trade-offs

- **Stdout pollution** → Any `console.log` calls in the pipeline would corrupt the JSON output. Mitigation: audit pipeline modules; they currently use no console logging in the hot path.
- **Strategy default** → Some repos may get different suggestions than they would under a user-chosen strategy. Mitigation: documented behaviour; `--strategy` flag can be added later if needed.

## Migration Plan

No migration needed. The flag is purely additive; existing behaviour is unchanged when the flag is absent.
