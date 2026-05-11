## Context

The codebase uses raw `console.log/.error/.warn` in roughly five operational call sites today (see `proposal.md` for the file:line inventory). In interactive Ink TUI mode, any `console.*` write corrupts the rendered screen, so the existing call sites are an active bug as well as a missing-feature. In headless `--analyze-only` mode the output goes to stdout/stderr but is unstructured and not persisted.

The project already has two side-effecting telemetry wrappers — `src/analytics.ts` (PostHog) and `src/ai/tracing.ts` (Langfuse) — both built on a "lazy-init, fire-and-forget, no-op on missing config" pattern. The file logger should look and feel the same, with the important difference that it is **always-on** (no env var gates initialization), since the issue specifies "always write logs to a file."

The runtime is Bun, so file I/O uses `node:fs` directly — no new dependency needed. Bun's `Bun.write` is also available but the streaming append pattern is cleaner with `fs.createWriteStream` (one open handle, kernel-buffered appends, automatic flush on process exit).

## Goals / Non-Goals

**Goals:**

- One importable logger with a tiny surface: `logger.debug/info/warn/error(msg, fields?)`.
- Always-on file sink. No env var gates initialization; only the path and level are configurable.
- JSONL output for grep/jq/log-tooling friendliness.
- Safe-to-fail: a missing log dir, a read-only filesystem, or a write error must never crash the app or appear in TUI output.
- TUI-safe by default: nothing the logger does writes to stdout. In headless mode, `warn`/`error` are also written to stderr in a compact human format.
- Migrate the five existing `console.*` operational call sites mechanically — no behavior change at the call sites beyond the sink.

**Non-Goals:**

- Log rotation, retention, or compression. Out of scope for v1 — append forever, let the user/OS deal with it. (Can revisit if anyone hits a real problem; logs for this app are low-volume.)
- Remote log shipping (Loki, Datadog, etc.). Langfuse covers AI-call observability already; file logs are local debugging only.
- A pluggable transport interface. YAGNI — one file sink and an optional stderr mirror is enough.
- Replacing user-facing error paths (Ink error views, headless error output). The logger is additive: those paths stay, and they additionally call `logger.error(...)` so the diagnostic is also persisted.
- Migrating test files' `console.*` calls. Tests use them as reporter output, not operational logs.
- Async/await on log writes. The logger interface is synchronous-looking (fire-and-forget); writes go to a stream and are flushed by Bun on exit.

## Decisions

### Decision 1: JSONL format with a fixed schema

Each log line is one JSON object: `{"ts":"<ISO-8601>","level":"info","msg":"...","...fields":...}`.

- **Why JSONL over plain text**: greppable with `jq`, machine-parseable for future tooling, and the project already uses JSONL for session output (per the existing analyze-only-output spec) — consistent with the codebase's existing serialization choices.
- **Why a flat shape**: nested fields complicate `jq` filters for no real gain at this volume. Callers pass a flat object of structured fields (e.g. `logger.warn("rate limit", { remaining: 12, resetIn: 60 })`).
- **Alternatives considered**: pino (popular Node logger) — rejected, it pulls a real dependency tree and the feature set is overkill. Plain `key=value` lines — rejected, not as machine-friendly and we already use JSONL elsewhere.

### Decision 2: Default path is XDG state dir, not cwd

Default: `${XDG_STATE_HOME:-$HOME/.local/state}/gh-star-constellation-finder/app.log`. Overridable via `LOG_FILE` env var (absolute path required; relative paths fall back to default with a warn line).

- **Why XDG state over `.logs/` in cwd**: the app is run from arbitrary directories (it doesn't have a "project root"). A user-home location keeps the log discoverable across runs and doesn't pollute random cwds. XDG state (not config, not cache) is the FHS-correct location for runtime state that should persist across reboots but isn't user-authored config.
- **Alternatives considered**: `.logs/app.log` in cwd — rejected, the app is a TUI run from anywhere. `~/.cache/...` — rejected, XDG cache is for data the app can regenerate; logs are diagnostic history. Bun's `import.meta.dir` — rejected, points at the installed binary location, not user state.

### Decision 3: Always-on, not opt-in

Unlike PostHog and Langfuse (which no-op without env vars), the file logger initializes unconditionally at startup. Only the level and path are configurable.

- **Why**: the issue explicitly says "always write logs to a file." Making it opt-in would defeat the purpose — most users won't set an env var and the file would never appear when needed.
- **Mitigation for the "I don't want a log file" case**: a user can set `LOG_LEVEL=error` to minimize volume, or point `LOG_FILE=/dev/null` (POSIX) to discard. Not adding a `LOG_DISABLED` knob — too easy to set accidentally and then lose diagnostics when they're actually needed.

### Decision 4: Stderr mirror only in headless mode, for warn/error only

In `--analyze-only`, the logger mirrors `warn` and `error` levels to stderr in a compact human-readable format (`<LEVEL> <msg> <key=val ...>`). In interactive TUI mode, the logger NEVER writes to any stdio stream — file only.

- **Why**: headless mode is the AI-tool-harness use case (per `improve-headless-mode` issue cluster). Harnesses watch stderr for failure signals; sending nothing would silently swallow errors. TUI mode owns the terminal — any stdio write corrupts Ink.
- **Why warn/error only, not info/debug**: at `info`/`debug` volume, mirroring would flood stderr and re-introduce TUI corruption risk if a future code path emits before init or after teardown. Critical-signal-only is the minimum useful mirror.
- **Alternatives considered**: always mirror everything to stderr in headless — rejected, see above. Mirror to stdout — rejected, headless mode writes structured analysis output to stdout (per analyze-only-output spec); logs must not pollute it.

### Decision 5: Level filtering at call site, not write site

The logger checks the configured level before formatting the JSON line. Below-threshold calls return immediately, no string interpolation, no JSON serialization.

- **Why**: keeps the hot path cheap. A `logger.debug(...)` call in a tight loop is effectively free at the default `info` level.
- **Alternatives considered**: format-then-filter — rejected, wastes CPU on dropped lines.

### Decision 6: `initLogger()` is called once, early, from `src/index.tsx`

Signature: `initLogger({ headless: boolean }): void`. Reads `LOG_LEVEL` and `LOG_FILE` from env, opens the write stream, sets module-level state. Subsequent `logger.*` calls are pure module-level functions that use the singleton stream.

- **Why a singleton**: there is one process and one log file. Passing a logger instance through every module would balloon the surface area. The PostHog and Langfuse wrappers are also module-level singletons — consistent.
- **Why `headless` is a constructor param, not read from `process.argv`**: argv parsing already happens in `src/cli/args.ts`. The logger shouldn't duplicate that parsing — the entry point already knows whether the run is headless and tells the logger.
- **Failure mode**: if `initLogger` throws (e.g., mkdir fails on a read-only home), it must catch internally and degrade to a no-op logger. All subsequent `logger.*` calls become no-ops. We do NOT crash the app over a log-init failure.

### Decision 7: Migration is mechanical, no semantic changes

Each existing `console.*` call site is rewritten to the equivalent logger call with the same level. No additional structured fields are added in this change — that's a follow-up. Example:

```ts
// before
console.warn(`GitHub rate limit low: ${remaining} remaining`);

// after
logger.warn("GitHub rate limit low", { remaining });
```

- **Why no field-enrichment now**: scope discipline. The issue is "introduce file logging," not "improve every existing log message." Each migrated site is one-for-one with what's there today.

## Risks / Trade-offs

- **Risk: Log file grows unboundedly.** → No rotation in v1. Mitigation: low volume in practice (the app emits a handful of lines per run), and the default level is `info`. If a user runs the app thousands of times, they may need to manually delete the file. Acceptable for v1; add rotation if anyone reports it.

- **Risk: Write stream not flushed on crash.** → `fs.createWriteStream` is buffered. On an uncaught exception or `SIGKILL`, recent lines may be lost. Mitigation: register a `process.on("exit", ...)` handler that calls `stream.end()`. For SIGKILL there's nothing we can do — acceptable, this is diagnostic logging, not transactional.

- **Risk: A `console.*` call sneaks back in via a new feature and corrupts TUI.** → Add an ESLint rule (`no-console` with allowlist for test files) as part of this change so future regressions are caught at lint time. The CLAUDE.md "Observability & telemetry" pointer also serves as docs.

- **Risk: Bun's `node:fs` shim differs from Node's around stream lifecycle.** → Mitigation: tests exercise open/write/end on the real filesystem (temp dir per test). If a Bun-specific quirk surfaces, swap to `Bun.write` with an append flag.

- **Trade-off: No structured request/correlation IDs.** → A multi-phase analysis run today has no trace ID linking its log lines. The Langfuse trace ID could be reused, but plumbing it into every logger call requires a context object we don't have. Defer to a later change if it becomes a debugging pain point.

- **Trade-off: `LOG_FILE=/dev/null` as the "disable" escape hatch is POSIX-only.** → On Windows, `NUL` would be the equivalent, but the app already has implicit POSIX assumptions (XDG path, Husky hooks). Acceptable.

## Migration Plan

1. Land `src/logger.ts` and tests behind no callers — verify it works in isolation.
2. Wire `initLogger` into `src/index.tsx` before any module that might log.
3. Migrate the five existing `console.*` operational call sites in one pass — straightforward replacement, no behavior change.
4. Add the `no-console` ESLint rule with `src/__tests__/**` allowlisted.
5. Update README env-var table and the CLAUDE.md "Observability & telemetry" section.

No rollback strategy needed — the change is additive and the migration is mechanical. If a regression appears, revert the PR.

## Open Questions

None at this point. All decisions above are concrete enough to implement. If `Bun.write` turns out to behave differently from `fs.createWriteStream` in append mode during implementation, the test suite will catch it and we'll switch — that's not a design-level open question.
