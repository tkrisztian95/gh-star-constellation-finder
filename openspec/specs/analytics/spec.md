### Requirement: Anonymous event tracking via PostHog
The system SHALL send anonymous usage events to PostHog for key interactions. No personally identifiable information (PII) SHALL be included in any event payload. All events SHALL be fire-and-forget; analytics failures MUST NOT interrupt or crash the app.

#### Scenario: Analysis started event
- **WHEN** the user confirms they want to proceed with analysis
- **THEN** an `analysis_started` event is sent with properties: `{ scope, backend, repoCount }`

#### Scenario: Analysis completed event
- **WHEN** analysis finishes without interruption
- **THEN** an `analysis_completed` event is sent with properties: `{ repoCount, suggestionCount, durationMs, backend, interrupted: false }`

#### Scenario: Analysis interrupted event
- **WHEN** the user presses ESC and chooses to exit or continue with partial results
- **THEN** an `analysis_completed` event is sent with properties: `{ repoCount: analyzedCount, interrupted: true, choice }`

#### Scenario: Suggestions applied event
- **WHEN** the user confirms applying suggestions and mutations complete
- **THEN** a `suggestions_applied` event is sent with properties: `{ accepted, failed, strategy }`

#### Scenario: Analytics failure does not affect app
- **WHEN** PostHog is unreachable or throws an error during event dispatch
- **THEN** the error is silently swallowed and the app continues normally

### Requirement: Persistent opt-out setting
The system SHALL read an `analyticsOptOut` boolean from the local config file at startup. When `analyticsOptOut` is `true`, no events SHALL be sent to PostHog and the PostHog client SHALL NOT be initialized.

#### Scenario: Opt-out persisted across runs
- **WHEN** the user runs the app with `--no-analytics` for the first time
- **THEN** `analyticsOptOut: true` is written to `~/.config/gh-star-constellation-finder/config.json`
- **AND** no PostHog events are sent during that run

#### Scenario: Opted-out user never sends events
- **WHEN** `analyticsOptOut: true` exists in the config file
- **THEN** no PostHog events are sent regardless of CLI flags

#### Scenario: Config file unreadable defaults to no analytics
- **WHEN** the config file cannot be read (permissions error, corrupt JSON)
- **THEN** analytics is disabled for that run and the app continues normally

### Requirement: Anonymous persistent distinct_id
The system SHALL generate a random UUID on first run and persist it as `analyticsId` in the local config file. This UUID SHALL be used as the PostHog `distinct_id`. It MUST NOT be derived from or correlated with any user identity.

#### Scenario: New install generates distinct_id
- **WHEN** no config file exists on first run
- **THEN** a new random UUID is generated, saved to config, and used as `distinct_id` for all events in that run

#### Scenario: Existing distinct_id is reused
- **WHEN** a config file with `analyticsId` already exists
- **THEN** the existing UUID is used as `distinct_id` without regeneration

### Requirement: First-run analytics notice
The system SHALL display a one-time informational notice informing the user that anonymous usage data is collected and how to opt out. The notice SHALL be shown before any analysis begins and SHALL be suppressed on subsequent runs.

#### Scenario: Notice shown on first run
- **WHEN** `analyticsNoticeSeen` is absent or `false` in config
- **THEN** a notice is displayed in the confirm screen: "Anonymous usage data is collected to improve this tool. Run with --no-analytics to opt out."
- **AND** `analyticsNoticeSeen: true` is written to config

#### Scenario: Notice suppressed after first run
- **WHEN** `analyticsNoticeSeen: true` exists in config
- **THEN** no analytics notice is shown

### Requirement: Graceful shutdown flushes analytics queue
The system SHALL call `analytics.shutdown()` before all `process.exit()` paths to ensure any buffered PostHog events are flushed.

#### Scenario: Events flushed on normal exit
- **WHEN** the app completes normally and calls `process.exit(0)`
- **THEN** PostHog's flush is awaited (with a short timeout) before the process exits

#### Scenario: Events flushed on early exit
- **WHEN** the user cancels at the confirm screen or scope screen
- **THEN** PostHog's flush is still called before `process.exit(0)`
