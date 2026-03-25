## Why

`--analyze-only` currently writes JSON only to stdout, requiring shell redirection to persist results. A dedicated `--output <path>` flag would let users save the JSON directly to a file without piping, making the mode more ergonomic for scripting and CI workflows.

## What Changes

- Add `--output <path>` CLI flag to `parseArgs()`
- When `--output` is combined with `--analyze-only`, write the JSON document to the specified file path instead of (or in addition to) stdout
- If the target file already exists, it is overwritten
- A short confirmation message is printed to stderr indicating the file was written (stdout remains clean JSON-only in analyze-only mode)
- `--output` without `--analyze-only` is an error; the CLI exits with a non-zero code and a helpful message

## Capabilities

### New Capabilities

- `analyze-only-save-to-file`: `--output <path>` flag that, when combined with `--analyze-only`, persists the JSON output to a file path instead of writing to stdout

### Modified Capabilities

- `analyze-only-output`: adds the `--output` flag interaction rule and the constraint that stdout remains clean when `--output` is used

## Impact

- `src/index.tsx`: extend `CliArgs` and `parseArgs()` with `outputPath`; add file-write branch in `runAnalyzeOnly()`
- No changes to AI, fetch, or suggestion modules
