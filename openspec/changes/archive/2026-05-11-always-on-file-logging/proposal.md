Tracks #13

## Why

The app has no operational log file. Today, errors and warnings from the GitHub fetch path, auth, and orchestration are emitted via raw `console.log/.error/.warn` to stdout/stderr. In interactive TUI mode this is actively harmful — any stray `console.*` call corrupts Ink rendering — and in headless mode the output is unstructured and ephemeral, with nothing persisted for post-hoc debugging. Users cannot inspect what happened during a run after the fact, and contributors cannot get a structured trace without re-running with bespoke instrumentation. A centralized, always-on file logger with an env-configurable level fixes both problems.

## What Changes

- New `src/logger.ts` module exporting a small logger interface (`debug`, `info`, `warn`, `error`) and a one-time `initLogger()` initializer called from `src/index.tsx` startup.
- Logger ALWAYS writes structured JSONL lines to a log file. Default path follows XDG state convention: `${XDG_STATE_HOME:-$HOME/.local/state}/gh-star-constellation-finder/app.log`. Overridable via `LOG_FILE` env var (absolute path).
- Log level is configurable via `LOG_LEVEL=debug|info|warn|error` env var. Default `info`. Invalid values fall back to `info` and emit a single warn line.
- The logger is **safe-to-fail**: any error opening or writing to the log file is swallowed; the app continues. No throws on the hot path. The file is opened in append mode, created (with parent dirs) if missing.
- In headless mode (`--analyze-only`), `warn` and `error` lines are also mirrored to **stderr** in a compact human-readable format so AI-tool harnesses still see critical signal. In interactive TUI mode, no stderr mirror — file only — to keep Ink rendering clean.
- Migrate existing operational `console.*` call sites to the new logger: [src/index.tsx:4](src/index.tsx#L4), [src/github/starFetcher.ts:73](src/github/starFetcher.ts#L73), [src/github/readmeFetcher.ts:82,91](src/github/readmeFetcher.ts#L82), [src/github/auth.ts:52](src/github/auth.ts#L52), [src/orchestration/main.tsx:50](src/orchestration/main.tsx#L50). Test files keep their `console.*` calls (they're test-reporter output, not operational logs).
- The logger is additive: user-facing errors that today surface via Ink components or headless output continue to do so. The logger is for diagnostics, not user UX.

### Breaking changes

None at the runtime contract level. Behaviorally, scattered `console.warn/.error` lines will stop appearing on stdout/stderr in interactive mode (they were already corrupting the TUI), and in headless mode `warn`/`error` will continue to appear on stderr (now via the logger's mirror), while `info`/`debug` will move exclusively to the file. Anyone parsing stdout/stderr for these specific messages must read the log file instead.

## Capabilities

### New Capabilities

- `file-logging`: Always-on append-mode JSONL log file with env-configurable level and conditional stderr mirroring in headless mode.

### Modified Capabilities

None. No existing spec owns the `console.*` call sites being migrated; the migration is a mechanical replacement that doesn't change spec-level behavior of GitHub fetch, auth, or orchestration.

## Impact

- **New module**: `src/logger.ts` (and supporting types).
- **Call-site migration**: `src/index.tsx`, `src/github/starFetcher.ts`, `src/github/readmeFetcher.ts`, `src/github/auth.ts`, `src/orchestration/main.tsx`.
- **Startup wiring**: `src/index.tsx` calls `initLogger()` before any other module imports that might log. Headless detection (presence of `--analyze-only`) is passed in so the stderr-mirror behavior can be set at init time.
- **Env vars added**: `LOG_LEVEL`, `LOG_FILE`. Both optional; documented in README env-var table.
- **Dependencies**: No new runtime dependencies. Uses Bun's built-in `node:fs` and `node:path`.
- **Tests**: New tests under `src/__tests__/logger.test.ts` covering level filtering, JSONL format, safe-to-fail behavior, and headless stderr-mirror gating.
- **Docs**: README env-var section gets `LOG_LEVEL` and `LOG_FILE` entries; `CLAUDE.md` "Observability & telemetry" section gets a one-line pointer to the logger.
