## Context

`--analyze-only` runs a headless pipeline and writes a JSON document to stdout via `process.stdout.write`. Users who want to persist the output must redirect stdout in the shell. This is fine for interactive use but awkward in CI or when stdout is already consumed by a pipe. The change adds `--output <path>` as a first-class flag that writes the file directly, keeping stdout clean.

The entire change is confined to `src/index.tsx`: the `CliArgs` type, `parseArgs()`, and `runAnalyzeOnly()`. No other modules are touched.

## Goals / Non-Goals

**Goals:**
- Add `--output <path>` flag that, combined with `--analyze-only`, writes JSON to a file
- Keep stdout clean (no JSON on stdout) when `--output` is provided
- Print a single confirmation line to stderr after writing
- Validate that `--output` is not used without `--analyze-only`

**Non-Goals:**
- Appending to existing files (always overwrite)
- Supporting multiple output targets simultaneously (file + stdout)
- Adding `--output` support to interactive TUI mode

## Decisions

### Write to file only — suppress stdout when `--output` is set

**Decision:** When `--output` is provided, write JSON to the file and do not write to stdout.

**Rationale:** Keeping stdout clean when a file is specified is consistent with standard Unix tool conventions (e.g., `curl -o file`). If both stdout and file were written, downstream pipes would receive duplicate data. Users who want stdout can omit `--output`.

**Alternative considered:** Always write to stdout and additionally write to the file. Rejected because it breaks piping and the existing spec requirement that stdout be clean JSON.

### Use `fs.writeFileSync` (synchronous write)

**Decision:** Use Node's `fs.writeFileSync` to persist the output.

**Rationale:** The JSON document is already fully constructed in memory before writing; there is no benefit to streaming. A synchronous write keeps the code simple and avoids additional async error-handling complexity.

### `--output` without `--analyze-only` is a hard error

**Decision:** Exit with code `1` and print a usage message to stderr if `--output` is provided without `--analyze-only`.

**Rationale:** `--output` has no defined semantics in TUI mode. Silently ignoring it would confuse users who expect a file to be written. A clear error message is safer.

### Confirmation message on stderr

**Decision:** After writing the file, print one line to stderr: `Saved analysis to <path>`.

**Rationale:** Stdout must remain clean; stderr is the conventional channel for progress/status messages in Unix CLI tools.

## Risks / Trade-offs

- **File overwrite without warning** → Acceptable for a CLI tool; documented in help text. No mitigation needed.
- **No atomic write (no temp-file + rename)** → If the process is killed mid-write the file may be partial. Low risk given the small payload size; not worth the added complexity.
- **`--output` path resolution** → Relative paths are resolved against `process.cwd()` (Node default). This is the expected behavior and requires no special handling.

## Migration Plan

No migration required. The flag is purely additive; existing `--analyze-only` invocations without `--output` are unaffected.
