## ADDED Requirements

### Requirement: --ask flag answers a question headlessly as JSON

The CLI SHALL accept `--ask "<question>"`. When present, it runs headlessly (no TUI) and writes a single JSON object to stdout with the shape `{ question, answer, citations: string[], retrieved: { url: string, score: number }[] }`, mirroring the `--analyze-only` headless contract. The process exits 0 on a produced answer.

#### Scenario: Headless answer emitted as JSON
- **WHEN** `--ask "<question>"` runs against a populated cache
- **THEN** a single JSON object with `question`, `answer`, `citations`, and `retrieved` is written to stdout and the process exits 0

#### Scenario: Backend parity
- **WHEN** `--ask` runs under either the OpenAI or the Ollama backend
- **THEN** it produces the same JSON contract through the shared retriever and answer modules

### Requirement: Unpopulated cache produces a clear error

When the embeddings cache has no vectors for the active embedder, `--ask` SHALL NOT attempt an answer. It SHALL emit a clear message telling the user to run analysis first (e.g. `--analyze-only`) and exit non-zero.

#### Scenario: Cache not yet populated
- **WHEN** `--ask "<question>"` runs before any analysis has populated the cache
- **THEN** it prints a message instructing the user to run analysis first and exits non-zero, without calling the answer step
