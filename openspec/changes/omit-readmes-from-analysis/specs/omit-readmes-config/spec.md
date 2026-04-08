## ADDED Requirements

### Requirement: CLI flag skips README fetching
The application SHALL accept a `--no-readmes` flag. When present, the README-fetching phase SHALL be skipped entirely and an empty `Map<string, string>` SHALL be passed as the readme source to the analysis pipeline. This applies to both the interactive mode and the `--analyze-only` mode.

#### Scenario: Flag bypasses fetchAllReadmes in interactive mode
- **WHEN** the user runs the app with `--no-readmes`
- **THEN** `fetchAllReadmes` is NOT called and analysis proceeds with empty readme strings for all repos

#### Scenario: Flag bypasses fetchAllReadmes in analyze-only mode
- **WHEN** the user runs the app with `--analyze-only --no-readmes`
- **THEN** `fetchAllReadmes` is NOT called in `runAnalyzeOnly` and analysis proceeds with empty readme strings for all repos

### Requirement: AppConfig persists omitReadmes preference
`AppConfig` SHALL include an `omitReadmes: boolean` field with a default value of `false`. The `readConfig` function SHALL return `false` for this field when it is absent from the config file on disk.

#### Scenario: Fresh config file defaults omitReadmes to false
- **WHEN** no config file exists on disk
- **THEN** `readConfig()` returns `{ omitReadmes: false, ... }`

#### Scenario: Config file with omitReadmes true is read correctly
- **WHEN** the config file contains `"omitReadmes": true`
- **THEN** `readConfig()` returns `{ omitReadmes: true, ... }`

### Requirement: NO_READMES env var skips README fetching
The application SHALL read `process.env.NO_READMES`. When its value is `"true"` (case-insensitive), README fetching SHALL be skipped, exactly as if `--no-readmes` were passed on the CLI.

#### Scenario: NO_READMES=true in environment skips fetching
- **WHEN** `process.env.NO_READMES` is `"true"` and `--no-readmes` is not passed
- **THEN** `fetchAllReadmes` is NOT called and analysis proceeds with empty readme strings for all repos

#### Scenario: NO_READMES=false does not skip fetching
- **WHEN** `process.env.NO_READMES` is `"false"` (or unset) and `--no-readmes` is not passed
- **THEN** README fetching proceeds normally

#### Scenario: NO_READMES is documented in .env.example
- **WHEN** a user opens `.env.example`
- **THEN** `NO_READMES=true` appears as a commented-out optional setting with a description

### Requirement: Precedence order is flag > env var > config
The application SHALL resolve `skipReadmes` by checking sources in this order: (1) `CliArgs.noReadmes`, (2) `process.env.NO_READMES === "true"`, (3) `AppConfig.omitReadmes`. The first truthy source wins.

#### Scenario: Flag overrides env var and config
- **WHEN** `--no-readmes` is passed, `NO_READMES` is `"false"`, and `AppConfig.omitReadmes` is `false`
- **THEN** README fetching is skipped

#### Scenario: Env var overrides config when flag is absent
- **WHEN** `--no-readmes` is NOT passed, `NO_READMES` is `"true"`, and `AppConfig.omitReadmes` is `false`
- **THEN** README fetching is skipped

### Requirement: Config option is respected when flag and env var are absent
When neither `--no-readmes` nor `NO_READMES=true` is active, the application SHALL fall back to `AppConfig.omitReadmes`. If that field is `true`, README fetching SHALL be skipped.

#### Scenario: omitReadmes true in config skips fetching without flag or env var
- **WHEN** `AppConfig.omitReadmes` is `true`, `--no-readmes` is not passed, and `NO_READMES` is unset
- **THEN** README fetching is skipped in both interactive and analyze-only modes

### Requirement: CliArgs exposes noReadmes field
The `CliArgs` interface SHALL include a `noReadmes: boolean` field (default `false`). The `parseArgs` function SHALL set `noReadmes` to `true` when `--no-readmes` is present in `process.argv`.

#### Scenario: Parsing --no-readmes sets noReadmes to true
- **WHEN** `process.argv` contains `--no-readmes`
- **THEN** `parseArgs()` returns `{ noReadmes: true, ... }`

#### Scenario: Absence of flag leaves noReadmes false
- **WHEN** `process.argv` does NOT contain `--no-readmes`
- **THEN** `parseArgs()` returns `{ noReadmes: false, ... }`
