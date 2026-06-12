## ADDED Requirements

### Requirement: AIProvider exposes a batch embed method

The `AIProvider` interface SHALL expose an `embed(texts: string[], signal?: AbortSignal, parent?: LangfuseParent | null): Promise<number[][]>` method that returns one embedding vector per input string, in input order. Implementations MUST be provided for both the OpenAI and Ollama backends behind the existing provider abstraction; retrieval and orchestration code MUST call `embed()` through the provider, never a vendor SDK directly.

#### Scenario: OpenAI backend embeds a batch
- **WHEN** `embed(["a", "b"])` is called on the OpenAI provider
- **THEN** it returns a 2-element array, each a 1536-dimension vector from `text-embedding-3-small`, in the same order as the inputs

#### Scenario: Ollama backend embeds a batch
- **WHEN** `embed(["a"])` is called on the Ollama provider
- **THEN** it returns a 1-element array containing a 768-dimension vector from `nomic-embed-text`

#### Scenario: Empty input
- **WHEN** `embed([])` is called on any provider
- **THEN** it returns an empty array without making a network call

### Requirement: Each provider exposes a stable embedder identity

Each provider SHALL expose an `embedderId` string that uniquely identifies the embedding model and dimensionality producing its vectors (e.g. `openai:text-embedding-3-small`, `ollama:nomic-embed-text`). The identity MUST change whenever the model or vector dimension changes so that downstream caches can detect stale vectors.

#### Scenario: Identity reflects the active model
- **WHEN** the OpenAI provider's `embedderId` is read
- **THEN** it returns a string that names the OpenAI embedding model and differs from the Ollama provider's `embedderId`

### Requirement: Embedding respects cancellation

When an `AbortSignal` passed to `embed()` is aborted, the in-flight embedding request SHALL reject rather than resolve, consistent with the cancellation behavior of the existing `analyze()` and `complete()` methods.

#### Scenario: Aborted embed rejects
- **WHEN** `embed(texts, signal)` is in flight and `signal` aborts
- **THEN** the returned promise rejects and no partial result is cached
