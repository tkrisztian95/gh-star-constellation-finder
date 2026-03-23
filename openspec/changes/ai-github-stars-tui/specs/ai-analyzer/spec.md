## ADDED Requirements

### Requirement: Analyze repository using a compact system prompt
The system SHALL send a structured prompt to the configured AI backend (OpenAI or Ollama) containing the repository's metadata and truncated README. The system prompt SHALL be: `"You are a technical librarian. Analyze the provided README content. Categorize it into a short 2-3 word topic (e.g., 'Vector Databases' or 'Rust CLI Tools') and provide one 'Killer Feature' in under 10 words."`

#### Scenario: Successful analysis
- **WHEN** the AI backend returns a valid response
- **THEN** the system SHALL parse a `category` (2-3 words) and a `killerFeature` (≤10 words) from the response

#### Scenario: AI response is malformed
- **WHEN** the AI response cannot be parsed into the expected structure
- **THEN** the system SHALL use the raw response text as the category and set killerFeature to an empty string, logging a parse warning

### Requirement: Support OpenAI API backend
The system SHALL use the OpenAI Chat Completions API (`gpt-4o-mini` by default) when `OPENAI_API_KEY` is set and the `--backend openai` flag is used (or default when key is present).

#### Scenario: OpenAI request succeeds
- **WHEN** `OPENAI_API_KEY` is set and the API returns HTTP 200
- **THEN** the system SHALL extract content from the first choice's message

#### Scenario: OpenAI API key absent
- **WHEN** `OPENAI_API_KEY` is not set and backend is `openai`
- **THEN** the system SHALL exit with `"Error: OPENAI_API_KEY is required for the openai backend"`

### Requirement: Support local Ollama backend
The system SHALL support sending requests to a local Ollama instance using the `--backend ollama` flag and the `OLLAMA_HOST` environment variable (default `http://localhost:11434`).

#### Scenario: Ollama is reachable
- **WHEN** `--backend ollama` is specified and Ollama responds to the model request
- **THEN** the system SHALL return the analysis result

#### Scenario: Ollama is unreachable
- **WHEN** the Ollama host cannot be reached
- **THEN** the system SHALL return an error per repository and mark that repo's suggestion as `analysis-failed`

### Requirement: Request JSON structured output
The system SHALL request JSON-formatted output from the AI backend (using OpenAI `response_format: { type: "json_object" }` or equivalent instruction for Ollama) to ensure consistent parsing.

#### Scenario: JSON output requested
- **WHEN** making an API call to either backend
- **THEN** the user message SHALL instruct the model to respond in JSON with keys `category` and `killerFeature`
