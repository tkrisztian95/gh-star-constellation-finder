## ADDED Requirements

### Requirement: Ollama complete() streams tokens with progress, abort, and early-exit
The Ollama provider's `complete()` SHALL request the model with streaming enabled and consume the NDJSON token stream incrementally. It SHALL preserve its existing contract — resolving to a single accumulated `content` string — while gaining three behaviours: progress reporting, mid-stream cancellation, and structural early-exit. `complete()` SHALL accept an optional options object carrying an `AbortSignal` and a progress callback; callers that pass neither SHALL observe unchanged behaviour aside from the streamed transport.

#### Scenario: Progress is reported during a long call
- **WHEN** a streaming `complete()` call is in progress and a progress callback was supplied
- **THEN** the provider SHALL invoke the callback periodically as tokens arrive (throttled, not per-token) so the consolidation UI can show live progress instead of a frozen screen

#### Scenario: ESC aborts the in-flight call
- **WHEN** the supplied `AbortSignal` is aborted while a streaming `complete()` call is reading
- **THEN** the provider SHALL stop reading and reject with an abort error, rather than waiting for the model to finish

#### Scenario: Structural early-exit on complete JSON
- **WHEN** the accumulated streamed content contains a balanced top-level JSON object (outermost `{...}` closed, braces inside quoted strings ignored)
- **THEN** the provider MAY stop reading early and resolve with the accumulated content, and SHALL also treat the stream's `done` signal as an authoritative terminator

#### Scenario: Per-call log records stream stats
- **WHEN** a streaming `complete()` call finishes
- **THEN** the file log SHALL record the number of tokens streamed, the `done_reason`, and the call latency, replacing the prior single-shot log entry

#### Scenario: complete() contract is unchanged for callers
- **WHEN** any caller awaits `complete()`
- **THEN** it SHALL receive a single `content` string exactly as before, regardless of whether streaming, progress, or abort were used
