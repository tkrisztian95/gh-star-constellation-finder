## ADDED Requirements

### Requirement: Logger module exposes a level-based API

The system SHALL provide a `logger` module at `src/logger.ts` exporting four level-based functions: `debug(msg, fields?)`, `info(msg, fields?)`, `warn(msg, fields?)`, and `error(msg, fields?)`. The `fields` argument SHALL be an optional object of structured key-value pairs serialized alongside the message. The functions SHALL be synchronous-returning (fire-and-forget) and MUST NOT throw.

#### Scenario: Caller invokes each level
- **WHEN** application code calls `logger.debug("msg", { k: 1 })`, `logger.info(...)`, `logger.warn(...)`, or `logger.error(...)`
- **THEN** the call returns immediately without throwing and the corresponding line (subject to level filtering) is written to the configured log file

#### Scenario: Caller omits fields
- **WHEN** application code calls `logger.info("ready")` without a fields argument
- **THEN** the emitted JSONL line contains only the standard envelope (`ts`, `level`, `msg`) with no extra keys

### Requirement: Logger is initialized once at startup

The system SHALL provide an `initLogger({ headless: boolean })` initializer that MUST be called exactly once from `src/index.tsx` before any module-level code that emits log lines. The initializer SHALL read `LOG_LEVEL` and `LOG_FILE` from `process.env`, open the log file in append mode (creating parent directories as needed), and configure the level threshold and stderr-mirror behavior. Calls to `logger.*` before `initLogger` SHALL be no-ops.

#### Scenario: Init succeeds with default env
- **WHEN** `initLogger({ headless: false })` is called with neither `LOG_LEVEL` nor `LOG_FILE` set
- **THEN** the log file is created at `${XDG_STATE_HOME:-$HOME/.local/state}/gh-star-constellation-finder/app.log` with the `info` level threshold and no stderr mirroring

#### Scenario: Logger call before init
- **WHEN** `logger.info("early")` is called before `initLogger` has run
- **THEN** the call returns immediately, writes nothing, and does not throw

### Requirement: Log file is always written, never gated by env

The system SHALL unconditionally write log lines to the configured file path whenever the call's level meets the configured threshold. The logger MUST NOT require any opt-in env var to begin writing — only the level and path are configurable.

#### Scenario: No env vars set
- **WHEN** the app runs with no logging-related env vars set
- **THEN** log lines at level `info` and above are still written to the default log file path

#### Scenario: User wants minimal output
- **WHEN** the user sets `LOG_LEVEL=error`
- **THEN** only `error` lines are written to the log file; `info`, `warn`, and `debug` calls produce no output but do not error

### Requirement: Log lines use JSONL format with a fixed envelope

Each log line SHALL be a single JSON object on one line, terminated by `\n`, with at minimum these keys: `ts` (ISO-8601 UTC timestamp), `level` (one of `"debug"`, `"info"`, `"warn"`, `"error"`), and `msg` (the caller-supplied message string). Any caller-supplied `fields` SHALL be merged into the same flat object. Caller fields MUST NOT overwrite `ts`, `level`, or `msg`.

#### Scenario: Line format
- **WHEN** `logger.warn("rate limit low", { remaining: 12, resetIn: 60 })` is called at threshold `info` or below
- **THEN** the file receives exactly one line: `{"ts":"<ISO-8601>","level":"warn","msg":"rate limit low","remaining":12,"resetIn":60}\n`

#### Scenario: Caller tries to overwrite envelope keys
- **WHEN** `logger.info("hi", { level: "error", msg: "spoofed", ts: "fake" })` is called
- **THEN** the emitted line's `ts`, `level`, and `msg` are the envelope values (`"info"`, `"hi"`, current timestamp), and the caller's bogus values are dropped

### Requirement: Log level is configurable via LOG_LEVEL env var

The system SHALL read the `LOG_LEVEL` env var at `initLogger` time and accept one of `debug`, `info`, `warn`, `error` (case-insensitive). The default SHALL be `info`. An unrecognized value SHALL fall back to `info` and SHALL itself trigger a single `warn`-level log line noting the invalid value.

#### Scenario: Valid level
- **WHEN** the app starts with `LOG_LEVEL=debug`
- **THEN** all four levels including `debug` are written to the log file

#### Scenario: Invalid level
- **WHEN** the app starts with `LOG_LEVEL=verbose`
- **THEN** the effective level is `info`, and a `warn`-level line noting `invalid LOG_LEVEL value` is emitted once at init time

#### Scenario: Case-insensitive
- **WHEN** the app starts with `LOG_LEVEL=WARN`
- **THEN** the effective level is `warn` with no fallback warning

### Requirement: Log file path is configurable via LOG_FILE env var

The system SHALL read the `LOG_FILE` env var at `initLogger` time. When set to an absolute path, the logger SHALL use that path. When unset, the logger SHALL use the XDG-state default. A relative path SHALL be rejected: the logger falls back to the default and emits a single `warn` line noting the rejection.

#### Scenario: Absolute path override
- **WHEN** the app starts with `LOG_FILE=/tmp/my-run.log`
- **THEN** log lines are written to `/tmp/my-run.log`, creating it (and any missing parent directories) if needed

#### Scenario: Relative path is rejected
- **WHEN** the app starts with `LOG_FILE=./local.log`
- **THEN** the logger uses the XDG default path and emits a `warn` line: `LOG_FILE must be an absolute path; falling back to default`

#### Scenario: Default path uses XDG_STATE_HOME when set
- **WHEN** the app starts with `XDG_STATE_HOME=/custom/state` and no `LOG_FILE`
- **THEN** the log file is at `/custom/state/gh-star-constellation-finder/app.log`

### Requirement: Logger is safe-to-fail

Any I/O error during init, write, or shutdown SHALL be swallowed by the logger. The application MUST continue to run normally even if the log file cannot be opened, written to, or flushed. The logger MUST NOT write any error to stdout under any condition, and MUST NOT write to stderr in interactive (non-headless) mode.

#### Scenario: Log directory creation fails
- **WHEN** `initLogger` is called on a system where the log directory cannot be created (e.g., read-only filesystem)
- **THEN** init returns without throwing, and all subsequent `logger.*` calls are no-ops

#### Scenario: Write fails mid-run
- **WHEN** the log file becomes unwritable mid-run (e.g., disk full)
- **THEN** subsequent `logger.*` calls return without throwing and do not surface the error to the user

#### Scenario: Logger never pollutes TUI stdio
- **WHEN** the app is running in interactive TUI mode and any logger call or internal logger error occurs
- **THEN** nothing is written to stdout or stderr; only the log file is touched

### Requirement: Stderr-mirror in headless mode for warn and error

When `initLogger` is called with `headless: true`, log lines at level `warn` or `error` SHALL also be written to `stderr` in a compact human-readable format: `<LEVEL> <msg> [<key>=<value> ...]\n`. Levels `debug` and `info` MUST NOT be mirrored. In interactive (non-headless) mode, the logger MUST NOT write to `stderr` for any level.

#### Scenario: Headless warn is mirrored
- **WHEN** the app is running with `--analyze-only` and `logger.warn("rate limit low", { remaining: 12 })` is called
- **THEN** the line is written to the log file as JSONL AND a line `WARN rate limit low remaining=12\n` is written to stderr

#### Scenario: Headless info is not mirrored
- **WHEN** the app is running with `--analyze-only` and `logger.info("starting analysis")` is called
- **THEN** the line is written only to the log file; nothing is written to stderr or stdout

#### Scenario: Interactive warn is not mirrored
- **WHEN** the app is running in interactive TUI mode and `logger.warn("rate limit low")` is called
- **THEN** the line is written only to the log file; nothing is written to stderr or stdout

### Requirement: Existing console-based operational logs are migrated

The system SHALL replace the operational `console.log/.error/.warn` call sites in `src/index.tsx`, `src/github/starFetcher.ts`, `src/github/readmeFetcher.ts`, `src/github/auth.ts`, and `src/orchestration/main.tsx` with equivalent `logger.*` calls at the same severity level. Test-file `console.*` usage under `src/__tests__/` SHALL NOT be migrated.

#### Scenario: All five files no longer emit operational console output
- **WHEN** the codebase is searched for operational `console.log`, `console.warn`, or `console.error` in `src/index.tsx`, `src/github/`, and `src/orchestration/`
- **THEN** no matches remain (excluding any that are intentionally part of user-facing CLI output, which there are none of as of this change)

#### Scenario: Test files retain console output
- **WHEN** the codebase is searched for `console.*` in `src/__tests__/`
- **THEN** existing test-reporter calls are unchanged

### Requirement: ESLint guards against console regressions

The project's ESLint configuration SHALL enable `no-console` for files under `src/` with `src/__tests__/**` allowlisted. Future code that introduces a new `console.*` call in non-test source SHALL fail the lint step.

#### Scenario: Lint fails on new console call
- **WHEN** a developer adds `console.log("debug")` to a file under `src/` outside `src/__tests__/`
- **THEN** `bun run lint` reports a `no-console` error and exits non-zero

#### Scenario: Test files are exempt
- **WHEN** an existing or new file under `src/__tests__/` uses `console.log`
- **THEN** `bun run lint` does not report a `no-console` error for that file
