## ADDED Requirements

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
