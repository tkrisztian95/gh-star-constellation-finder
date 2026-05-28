# repo-analysis-prompt Specification

## Purpose
TBD - created by archiving change improve-ai-analysis-prompts. Update Purpose after archive.
## Requirements
### Requirement: Shared prompt module
The system SHALL provide a single `src/ai/prompts.ts` module that exports the system prompt string and the `buildUserMessage` function. Both `openaiAnalyzer.ts` and `ollamaAnalyzer.ts` MUST import from this module instead of defining prompt strings locally.

#### Scenario: Single source of truth
- **WHEN** a developer modifies the system prompt text
- **THEN** the change is reflected in both OpenAI and Ollama analyzers without any further edits

### Requirement: Category naming rules
The system prompt SHALL instruct the model to produce a `category` value that is Title Case, 2–4 words, and describes a concrete technical domain (e.g., "Rust CLI Tools", "Vector Databases", "React State Management"). The prompt SHALL include at least two positive examples and one negative example (too generic).

#### Scenario: Title Case output
- **WHEN** the model produces a category for a repository
- **THEN** the category string uses Title Case (e.g., "GraphQL Clients", not "graphql clients" or "GRAPHQL CLIENTS")

#### Scenario: Specificity over generality
- **WHEN** the model analyses a React state management library
- **THEN** the category is "React State Management" or similar, not "JavaScript Tools"

### Requirement: Killer feature framing
The system prompt SHALL instruct the model to produce a `killerFeature` value using action-verb framing that describes a user benefit in ≤12 words (e.g., "Deploy serverless functions with zero config changes"). The prompt SHALL include at least one positive and one negative example.

#### Scenario: Action-verb start
- **WHEN** the model produces a killer feature for a repository
- **THEN** the value begins with an imperative action verb (e.g., "Run", "Deploy", "Generate", "Query")

#### Scenario: Word count constraint
- **WHEN** the model produces a killer feature
- **THEN** the value contains 12 words or fewer

### Requirement: Sparse data fallback
The system prompt SHALL instruct the model to set `dataQuality` to `"sparse"` when the README is absent or fewer than 50 characters, and to `"full"` otherwise. The `AnalysisResult` type SHALL include an optional `dataQuality: "full" | "sparse"` field.

#### Scenario: No README
- **WHEN** the repository has no README content
- **THEN** the model returns `dataQuality: "sparse"` in addition to its best-effort `category` and `killerFeature`

#### Scenario: Full README
- **WHEN** the repository has a README with substantive content
- **THEN** the model returns `dataQuality: "full"`

### Requirement: Purpose context in system prompt
The system prompt SHALL inform the model that the `category` value will be used as a GitHub List name on the user's profile, so it must be human-readable, specific, and consistently formatted across multiple repository analyses.

#### Scenario: Category fits GitHub List naming
- **WHEN** the model produces a category
- **THEN** the value is suitable for use as a GitHub List name (Title Case, meaningful to a developer browsing their profile)

### Requirement: Retrieval-friendly description field
The `AnalysisResult` type SHALL include a required `description: string` field. The system prompt SHALL instruct the model to produce a `description` value of 1–2 factual technical sentences that state what the repository is and does, written for semantic search and embedding rather than marketing. The prompt SHALL forbid marketing language (e.g., "blazingly fast", "the best", "revolutionary") and SHALL include at least one positive example and one negative (marketing-flavoured) example.

#### Scenario: Description is factual and technical
- **WHEN** the model analyses a repository with substantive README content
- **THEN** the `description` is 1–2 sentences describing the repo's purpose and capabilities in neutral technical language, without marketing adjectives

#### Scenario: Description distinct from killer feature
- **WHEN** the model produces both `killerFeature` and `description` for the same repo
- **THEN** the `killerFeature` remains a single ≤12-word benefit statement while the `description` is a fuller technical summary suitable for embedding

#### Scenario: AnalysisResult type carries the field
- **WHEN** a successful analysis result is constructed
- **THEN** the `AnalysisResult` object SHALL contain a `description` string property (empty string when the model omitted it)

