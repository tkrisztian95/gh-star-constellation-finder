## Context

The app currently always fetches READMEs for every starred repository before analysis. This is done via `fetchAllReadmes` in both the interactive flow (`src/orchestration/main.tsx`) and the analyze-only flow (`src/cli/modes.ts`). The fetched map is then passed into `runAnalysis`, which looks up each repo's README and forwards it to the AI analyzer.

Adding a `--no-readmes` flag and a persistent config field allows users to opt out of this step entirely, trading richer AI context for lower latency and reduced GitHub API usage.

## Goals / Non-Goals

**Goals:**
- Add a `--no-readmes` CLI flag that bypasses README fetching
- Add a `omitReadmes: boolean` field to `AppConfig` (default `false`) so the preference survives across runs
- When either the flag or the config option is active, pass an empty `Map` to `runAnalysis` so the rest of the pipeline is unchanged

**Non-Goals:**
- Selective per-repo README skipping
- Changing the analyzer prompt structure when readmes are absent
- Surfacing the setting via an interactive TUI menu

## Decisions

### Three-source precedence: flag > env var > config
The `--no-readmes` CLI flag always wins. When absent, the app checks `process.env.NO_READMES` (truthy when `"true"`, case-insensitive). If that is also unset, it falls back to `AppConfig.omitReadmes`. This mirrors how other env vars (`OPENAI_API_KEY`, `OLLAMA_HOST`) are read directly via `process.env` without a dedicated abstraction.

**Alternative considered**: Flag and config only, no env var. Rejected because `.env`-based configuration is the established pattern in this project for options that differ per environment (e.g., CI vs. local dev).

### Empty Map, not null
When readmes are skipped, `fetchAllReadmes` is not called and an empty `Map<string, string>` is passed downstream. This avoids null-checks throughout `runAnalysis` and `modes.ts`, since the existing `?? ""` fallback already handles missing entries correctly.

**Alternative considered**: Pass `null` and add a guard inside `runAnalysis`. More invasive for no benefit.

### Config field on `AppConfig`, not a separate config file
`AppConfig` already lives in `~/.config/gh-star-constellation-finder/config.json` and has a `readConfig`/`writeConfig` pattern. Adding `omitReadmes` there is the lowest-friction path for persistent user preference.

## Risks / Trade-offs

- **Degraded AI categorization quality** → Mitigation: this is an explicit opt-in; default remains `false`. The TUI fetching phase already shows progress so users understand what they're trading away.
- **Config file schema drift** → Mitigation: `readConfig` already merges against `DEFAULTS`, so old config files without the field will safely default to `false`.
