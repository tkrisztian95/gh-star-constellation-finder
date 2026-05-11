# consolidation-distribution-context Specification

## Purpose
TBD - created by archiving change informed-category-consolidation. Update Purpose after archive.
## Requirements
### Requirement: Distribution summary prompt accepts analyzed repos grouped by category
The `buildDistributionSummaryPrompt` function SHALL accept a `categorizedRepos` map of category name to an array of repo metadata objects (each with `name`, `description`, `language`, and `topics` — no README). It SHALL return a prompt string that instructs the AI to return a JSON object mapping each category name to `{ count: number, topics: string[] }` where `topics` contains the top representative topic signals for that group.

#### Scenario: Prompt is built for a non-empty category map
- **WHEN** `buildDistributionSummaryPrompt` is called with a map of 5 categories containing varied repos
- **THEN** the returned string contains all 5 category names and instructs the AI to produce a JSON mapping with `count` and `topics` fields for each

#### Scenario: Prompt omits README fields
- **WHEN** repos passed to `buildDistributionSummaryPrompt` have a `readme` field
- **THEN** the readme content SHALL NOT appear in the generated prompt string

### Requirement: Consolidation prompt accepts an optional distribution context block
The `buildConsolidationPrompt` function SHALL accept an optional `distributionContext: string` parameter. When provided and non-empty, the function SHALL insert it as a `DISTRIBUTION CONTEXT` section immediately before the `NOW PROCESS THIS INPUT` section.

#### Scenario: Distribution context is injected when provided
- **WHEN** `buildConsolidationPrompt` is called with a non-empty `distributionContext` string
- **THEN** the returned prompt contains a `DISTRIBUTION CONTEXT` section with that content before the input list

#### Scenario: Distribution context is absent when not provided
- **WHEN** `buildConsolidationPrompt` is called without `distributionContext`
- **THEN** the returned prompt does NOT contain a `DISTRIBUTION CONTEXT` section and is identical to the current output

### Requirement: consolidateCategories runs a distribution summary pass before consolidation
When `analyzedRepos` are provided, `consolidateCategories` SHALL run Pass 0 before Pass 1: it builds a category→repos map from `analyzedRepos`, calls `buildDistributionSummaryPrompt`, calls the AI provider, parses the JSON response, and formats the result into a human-readable `distributionContext` string that is passed to `buildConsolidationPrompt` in Pass 2.

#### Scenario: Pass 0 succeeds and context is injected
- **WHEN** `consolidateCategories` is called with `analyzedRepos` and the provider returns valid JSON for the distribution prompt
- **THEN** the consolidation prompt used in Pass 2 contains a non-empty `DISTRIBUTION CONTEXT` section

#### Scenario: Pass 0 fails and consolidation continues unchanged
- **WHEN** `consolidateCategories` is called with `analyzedRepos` but the provider throws during Pass 0
- **THEN** `consolidateCategories` SHALL still complete using Pass 1 and Pass 2 without distribution context, with no error surfaced to the caller

#### Scenario: Pass 0 is skipped when analyzedRepos is not provided
- **WHEN** `consolidateCategories` is called without `analyzedRepos`
- **THEN** Pass 0 SHALL NOT run, the provider SHALL NOT be called for a distribution prompt, and behavior SHALL be identical to the pre-change implementation

### Requirement: consolidateCategories accepts an optional analyzedRepos parameter
The `consolidateCategories` function signature SHALL accept an optional `analyzedRepos?: AnalyzedRepo[]` parameter. When omitted or empty, the function SHALL behave identically to the current implementation. The parameter SHALL be positioned after the existing `parent` parameter.

#### Scenario: Signature is backward-compatible when analyzedRepos is omitted
- **WHEN** any call-site calls `consolidateCategories` without the `analyzedRepos` argument
- **THEN** the function runs exactly as before with no change in output or error behavior

#### Scenario: Call-sites in review.ts, analysis.ts, and cli/modes.ts pass analyzedRepos
- **WHEN** consolidation is triggered from the normal review flow or interrupt-save flow
- **THEN** `analyzedRepos` is passed to `consolidateCategories` so Pass 0 can run

