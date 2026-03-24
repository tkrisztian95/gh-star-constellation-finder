### Requirement: Ollama model is configurable via environment variable
The system SHALL read the `OLLAMA_MODEL` environment variable to determine which model to use when making requests to the Ollama API. When `OLLAMA_MODEL` is not set, the system SHALL default to `llama3`.

#### Scenario: OLLAMA_MODEL is set
- **WHEN** the `OLLAMA_MODEL` environment variable is set to a value (e.g., `qwen2.5:7b`)
- **THEN** the Ollama analyzer SHALL use that value as the model name in all API requests

#### Scenario: OLLAMA_MODEL is not set
- **WHEN** the `OLLAMA_MODEL` environment variable is absent or empty
- **THEN** the Ollama analyzer SHALL use `llama3` as the model name

### Requirement: OLLAMA_MODEL is documented in .env.example
The `.env.example` file SHALL include an entry for `OLLAMA_MODEL` with the default value `llama3` so users know the variable exists.

#### Scenario: Developer reads .env.example
- **WHEN** a developer opens `.env.example`
- **THEN** they SHALL see `OLLAMA_MODEL=llama3` as an example configuration entry
