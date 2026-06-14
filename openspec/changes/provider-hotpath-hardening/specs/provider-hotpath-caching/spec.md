## ADDED Requirements

### Requirement: Ollama keeps the model resident across the hot path via keep_alive
The Ollama provider SHALL send a configurable `keep_alive` value (default `"10m"`) on every `/api/chat` request, so the model stays loaded across the analyze batch and the consolidation calls rather than cold-reloading between calls. The value SHALL be configurable, and SHALL be a silent no-op on Ollama versions or deployments that ignore it.

#### Scenario: keep_alive sent on analyze and complete calls
- **WHEN** the Ollama provider issues an `/api/chat` request for either `analyze()` or `complete()`
- **THEN** the request body SHALL include the configured `keep_alive` value

#### Scenario: keep_alive is configurable
- **WHEN** the operator sets the keep_alive configuration to a custom duration
- **THEN** that value SHALL be used in place of the `"10m"` default

#### Scenario: Unsupported deployment is unaffected
- **WHEN** the Ollama deployment ignores `keep_alive`
- **THEN** the run SHALL proceed identically with no error

### Requirement: OpenAI analyze prompt marks stable content as cacheable (best-effort)
When the installed OpenAI SDK exposes a prompt-caching hint, the OpenAI provider SHALL mark the stable system/few-shot portion of the analyze prompt as cacheable to reduce repeated input cost across the 100–250 analyze calls per run. When the SDK does not expose such a hint, the provider SHALL proceed without it and SHALL NOT error — this requirement is best-effort.

#### Scenario: Cacheable marking applied when supported
- **WHEN** the OpenAI SDK supports a prompt-caching hint and `analyze()` is called
- **THEN** the stable system/few-shot block SHALL be marked cacheable while per-repo content remains uncached

#### Scenario: Silent no-op when unsupported
- **WHEN** the OpenAI SDK does not expose a prompt-caching hint
- **THEN** `analyze()` SHALL run unchanged with no caching hint and no error

#### Scenario: Behaviour identical in TUI and headless modes
- **WHEN** caching or keep_alive is active
- **THEN** the analyze and consolidate pipelines SHALL produce identical results in interactive TUI and `--analyze-only` modes (performance only, no output delta)
