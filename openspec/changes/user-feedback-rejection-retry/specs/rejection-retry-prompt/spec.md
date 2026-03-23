## ADDED Requirements

### Requirement: buildRetryPrompt constructs a negative-constraint user message
The `src/ai/prompts.ts` module SHALL export a `buildRetryPrompt(repo, priorSuggestion, rejectionReason?: string): string` function. The returned string SHALL prepend a rejection context block — containing the prior suggestion and reason — before the standard repository metadata and README content, instructing the model not to repeat the rejected approach.

#### Scenario: Retry prompt with rejection reason
- **WHEN** `buildRetryPrompt` is called with a prior suggestion of `{ category: "Developer Tools" }` and reason `"too generic"`
- **THEN** the returned string SHALL contain a block such as: `"Previously rejected: category='Developer Tools'. Reason: too generic. Do NOT suggest this category or anything equally generic."`

#### Scenario: Retry prompt without rejection reason
- **WHEN** `buildRetryPrompt` is called with no reason
- **THEN** the returned string SHALL contain a fallback instruction such as: `"Previously rejected: category='Developer Tools'. No reason given. Try a more specific or differently framed category."`

#### Scenario: Standard repo content is still included
- **WHEN** `buildRetryPrompt` is called
- **THEN** the returned string SHALL still include the repository name, description, language, and truncated README content as per the standard user message format

### Requirement: Analyzers accept an optional retry context parameter
Both `openaiAnalyzer.ts` and `ollamaAnalyzer.ts` SHALL accept an optional `retryContext: { priorSuggestion: Suggestion; reason?: string }` parameter on their `analyze(repo, retryContext?)` method. When provided, they SHALL call `buildRetryPrompt` instead of `buildUserMessage`.

#### Scenario: Analyzer called with retry context
- **WHEN** `analyze(repo, { priorSuggestion, reason })` is called
- **THEN** the analyzer SHALL use the retry prompt and submit the request to the AI backend identically to a normal analysis call

#### Scenario: Analyzer called without retry context
- **WHEN** `analyze(repo)` is called without a second argument
- **THEN** the analyzer SHALL behave identically to the pre-retry implementation

### Requirement: Retry prompt negative constraint is explicit and model-legible
The rejection context block in the retry prompt SHALL use direct imperative language to prevent the model from repeating the same mistake. The block SHALL appear before the repo content so the model reads the constraint before the data.

#### Scenario: Constraint placement
- **WHEN** the retry prompt is assembled
- **THEN** the rejection context block SHALL appear as the first paragraph of the user message, before repository metadata
