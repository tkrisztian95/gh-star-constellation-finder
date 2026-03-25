## Why

Running the full interactive TUI is the only way to see analysis results, making it hard to inspect, script, or pipe the AI analysis output into other tools. An `--analyze-only` flag would short-circuit the TUI and emit a machine-readable JSON payload to stdout, enabling non-interactive use cases.

## What Changes

- Add `--analyze-only` CLI flag to `parseArgs()`
- When the flag is set, skip GitHub authentication for mutations (read-only), skip the confirm / strategy / review / summary TUI screens, run the full analysis + consolidation + suggestion pipeline, and print a JSON document to stdout
- JSON output includes: the list of analyzed repos (with their AI-assigned category, killer feature, and data quality) and the generated suggestions
- Process exits with code `0` after printing; the Ink TUI is never rendered in this mode

## Capabilities

### New Capabilities

- `analyze-only-output`: CLI flag that triggers headless, non-interactive mode and outputs structured JSON containing the starred repo analysis and suggestions

### Modified Capabilities

<!-- No existing spec-level requirements change -->

## Impact

- `src/index.tsx`: new branch in `main()` for `--analyze-only` mode; `parseArgs()` extended
- No changes to AI, GitHub fetch, or suggestion engine modules
- No GitHub write operations are performed in this mode
