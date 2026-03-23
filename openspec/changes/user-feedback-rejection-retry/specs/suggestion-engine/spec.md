## ADDED Requirements

### Requirement: Orchestrate retry analysis pass for rejected repositories
The suggestion engine SHALL expose a `retryRejected(entries: RejectedEntry[], analyzer: Analyzer): Promise<Suggestion[]>` function. For each entry it SHALL call `analyzer.analyze(repo, { priorSuggestion: entry.suggestion, reason: entry.reason })` and convert the result into a new suggestion using the existing suggestion-generation logic.

#### Scenario: Retry produces new suggestions
- **WHEN** `retryRejected` is called with two `RejectedEntry` objects
- **THEN** the function SHALL return an array of two new suggestions (one per repo), using the retry-prompt-aware analyzer

#### Scenario: Retry analyzer failure
- **WHEN** the analyzer returns an error for a repo during the retry pass
- **THEN** the system SHALL mark that repo's retry suggestion as `analysis-failed` and continue processing remaining entries (same behaviour as initial analysis failures)

### Requirement: Retry suggestions are structurally identical to initial suggestions
Suggestions produced by the retry pass SHALL use the same `Suggestion` type as initial suggestions. No new type is needed. The retry pass result is a plain `Suggestion[]` that feeds directly into the existing TUI review flow.

#### Scenario: Retry suggestion type compatibility
- **WHEN** a retry suggestion is produced
- **THEN** it SHALL be a valid `Suggestion` object accepted by the TUI review model without modification
