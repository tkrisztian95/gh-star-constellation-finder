## MODIFIED Requirements

### Requirement: Analyze repository using a compact system prompt
The system SHALL send a structured prompt to the configured AI backend (OpenAI or Ollama) containing the repository's metadata and truncated README. The system prompt SHALL be: `"You are a technical librarian. Analyze the provided README content. Categorize it into a short 2-3 word topic (e.g., 'Vector Databases' or 'Rust CLI Tools') and provide one 'Killer Feature' in under 10 words."`

#### Scenario: Successful analysis
- **WHEN** the AI backend returns a valid response
- **THEN** the system SHALL parse a `category` (2-3 words), a `killerFeature` (≤10 words), and a `description` (1–2 technical sentences) from the response

#### Scenario: AI response is malformed
- **WHEN** the AI response cannot be parsed into the expected structure
- **THEN** the system SHALL use the raw response text as the category, set killerFeature to an empty string, set description to an empty string, and log a parse warning

#### Scenario: Response omits the description field
- **WHEN** the AI response is valid JSON with `category` and `killerFeature` but no `description` key
- **THEN** the system SHALL accept the response and set `description` to an empty string rather than failing validation

### Requirement: Request JSON structured output
The system SHALL request JSON-formatted output from the AI backend (using OpenAI `response_format: { type: "json_object" }` or equivalent instruction for Ollama) to ensure consistent parsing.

#### Scenario: JSON output requested
- **WHEN** making an API call to either backend
- **THEN** the user message SHALL instruct the model to respond in JSON with keys `category`, `killerFeature`, and `description`
