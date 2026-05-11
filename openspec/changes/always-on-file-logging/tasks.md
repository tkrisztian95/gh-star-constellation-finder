## 1. Logger module

- [ ] 1.1 Create `src/logger.ts` with the level-based API (`debug`, `info`, `warn`, `error`) and an `initLogger({ headless })` initializer; calls before init are no-ops
- [ ] 1.2 Implement env-var parsing for `LOG_LEVEL` (case-insensitive, fallback to `info` with a warn line on invalid) and `LOG_FILE` (absolute path only; reject relative with a warn line)
- [ ] 1.3 Implement the default path resolver: `${XDG_STATE_HOME:-$HOME/.local/state}/gh-star-constellation-finder/app.log`, creating parent dirs with `fs.mkdirSync(..., { recursive: true })`
- [ ] 1.4 Open the file with `fs.createWriteStream(path, { flags: "a" })` and store the singleton stream at module scope; register a `process.on("exit", () => stream.end())` flush hook
- [ ] 1.5 Implement JSONL envelope serialization (`ts`, `level`, `msg`, ...fields) with envelope keys non-overwritable by callers; level check happens before serialization
- [ ] 1.6 Implement the stderr-mirror branch: gated on `headless: true`, fires only for `warn`/`error`, formats as `<LEVEL> <msg> [<key>=<value> ...]`
- [ ] 1.7 Wrap every external operation (mkdir, open, write, end) in try/catch so I/O errors degrade to no-op without throwing; no internal error ever writes to stdout, and stderr is only touched via the headless mirror branch

## 2. Tests

- [ ] 2.1 Add `src/__tests__/logger.test.ts` with a temp-dir fixture: each test creates a unique temp `LOG_FILE`, reads the file after the run, asserts contents
- [ ] 2.2 Test JSONL envelope: each level emits one well-formed line with `ts`/`level`/`msg` and merged fields; envelope keys cannot be overwritten
- [ ] 2.3 Test level filtering: `LOG_LEVEL=warn` drops `info`/`debug` calls (no line written), keeps `warn`/`error`
- [ ] 2.4 Test invalid `LOG_LEVEL` falls back to `info` and emits the warn-line about invalid value
- [ ] 2.5 Test `LOG_FILE`: absolute path is used; relative path is rejected with a warn line, default is used
- [ ] 2.6 Test pre-init calls are no-ops (no file created, no throw)
- [ ] 2.7 Test safe-to-fail: point `LOG_FILE` at an unwritable path (e.g. inside a `chmod 000` dir or `/proc/1/forbidden`); init returns, subsequent calls no-op, app does not throw
- [ ] 2.8 Test headless stderr-mirror: capture stderr, assert `warn`/`error` lines appear in compact format when `headless: true`, and that `info`/`debug` do NOT mirror
- [ ] 2.9 Test interactive mode never writes to stderr or stdout: capture both, assert empty for all four levels

## 3. Wire-up at startup

- [ ] 3.1 In `src/index.tsx`, detect headless mode from parsed CLI args (the `--analyze-only` flag — get it from `src/cli/args.ts`)
- [ ] 3.2 Call `initLogger({ headless })` as the very first side-effecting line, before any other module init that might log
- [ ] 3.3 Verify with a quick smoke run (`bun run src/index.tsx --help` or similar minimal invocation) that the log file is created at the expected default path

## 4. Migrate existing console call sites

- [ ] 4.1 `src/index.tsx:4` — replace `console.error` with `logger.error` (preserve message + add error object as structured field)
- [ ] 4.2 `src/github/starFetcher.ts:73` — replace `console.log` with `logger.warn` (this is the rate-limit warning; warn is the correct level) with structured fields for remaining count / reset
- [ ] 4.3 `src/github/readmeFetcher.ts:82, 91` — replace both `console.error` calls with `logger.error`, attaching the repo identifier and error message as structured fields
- [ ] 4.4 `src/github/auth.ts:52` — replace `console.warn` with `logger.warn`, preserving the auth-edge-case message
- [ ] 4.5 `src/orchestration/main.tsx:50` — replace `console.error` with `logger.error`, attaching the failure context as structured fields
- [ ] 4.6 Run `bun run typecheck` and `bun run lint` after the migration pass; fix any issues
- [ ] 4.7 Run `bun run test`; fix anything that breaks (most likely: a test was asserting stdout content from a migrated call site — update the assertion to read the log file or drop the assertion if obsolete)

## 5. ESLint guard

- [ ] 5.1 Add `no-console: "error"` to `eslint.config.*` for `src/**/*.{ts,tsx}` with an override allowlist for `src/__tests__/**`
- [ ] 5.2 Run `bun run lint` and confirm a clean pass (any remaining `console.*` in non-test source would now fail; that's the migration completeness check)

## 6. Docs

- [ ] 6.1 Update README env-var section to document `LOG_LEVEL` (default `info`, accepted values) and `LOG_FILE` (default XDG path, absolute paths only)
- [ ] 6.2 Add a one-line pointer to the logger in the project `CLAUDE.md` "Observability & telemetry" section (point at `src/logger.ts` and note that new code should use it, not `console.*`)

## 7. Final validation

- [ ] 7.1 Run the full quality gate locally: `bun run typecheck && bun run lint && bun run format:check && bun run test`
- [ ] 7.2 Smoke test interactive mode: run the TUI briefly, confirm zero stdout/stderr corruption and that the log file received expected lines
- [ ] 7.3 Smoke test headless mode: run with `--analyze-only`, confirm `warn`/`error` lines appear on stderr in compact form and the log file received JSONL
- [ ] 7.4 Run `openspec validate --strict always-on-file-logging` to confirm the change artifacts are well-formed
- [ ] 7.5 Run `mcp__gitnexus__detect_changes` on the staged set before the final commit and report risk summary
