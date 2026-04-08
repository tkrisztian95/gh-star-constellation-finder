## Why

Fetching READMEs for every starred repository adds significant latency and GitHub API cost, and users may prefer to run a faster, description-only analysis when README content is not needed or when API rate limits are a concern.

## What Changes

- Add a `--no-readmes` CLI flag that skips README fetching entirely during analysis
- Add a `NO_READMES=true` environment variable as an alternative to the flag (configurable via `.env`)
- Add a `omitReadmes` field to `AppConfig` so the preference can be persisted across runs
- Precedence: CLI flag > env var > config file
- When any of these sources is active, the README fetching phase is skipped and repos are analyzed using only their name, description, language, and topics

## Capabilities

### New Capabilities
- `omit-readmes-config`: A persistent configuration option (`omitReadmes: boolean`) in `AppConfig`, a `--no-readmes` CLI flag, and a `NO_READMES=true` env var that, when any is set, causes the application to skip the README-fetching phase and pass an empty string as the readme field to the analyzer

### Modified Capabilities
- None

## Impact

- `src/cli/args.ts`: new `noReadmes` field on `CliArgs`, new `--no-readmes` flag parsing
- `src/config.ts`: new `omitReadmes` field on `AppConfig` with default `false`
- `src/orchestration/main.tsx`: skip `fetchAllReadmes` call when flag, env var, or config is active; pass empty map to `runAnalysis`
- `src/cli/modes.ts` (`runAnalyzeOnly`): same skip logic for the analyze-only path
- `.env.example`: document `NO_READMES=true` as an optional variable
