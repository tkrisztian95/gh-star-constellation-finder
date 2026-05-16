# Changelog

All notable changes to this project are documented here. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

The authoritative per-commit history lives in [git log](https://github.com/tkrisztian95/gh-star-constellation-finder/commits/main); this file is the curated story.

## [Unreleased]

### Changed

- README pipeline mermaid replaced with a one-sentence summary; the diagram-heavy engine doc was rewritten as prose with file/line pointers into [docs/ai-engine-workflow.md](./docs/ai-engine-workflow.md).
- README now opens with an explicit ⚠️ Disclaimer block flagging that GitHub mutations are real and unrecoverable, AI suggestions are best-effort, and (with OpenAI) repo metadata + README excerpts leave the device.
- Dev/release dependencies refreshed; the moderate `brace-expansion` advisory ([GHSA-f886-m6hf-6m8v](https://github.com/advisories/GHSA-f886-m6hf-6m8v)) is now resolved via a package-lock override pinning to `^5.0.6`.

### Added

- [CONTRIBUTING.md](./CONTRIBUTING.md) at the repo root — GitHub auto-surfaces it in the new-issue and new-PR UI.
- [SECURITY.md](./SECURITY.md) — private reporting via GitHub Security Advisories; out-of-scope items called out so triage isn't a guessing game.
- `.github/ISSUE_TEMPLATE/` (`bug_report.md`, `feature_request.md`, `config.yml`) with the existing label taxonomy pre-applied. Blank issues are disabled; the config also links to GitHub Security Advisories for vulnerability reports.
- `.github/PULL_REQUEST_TEMPLATE.md` enforcing `Closes #N`, OpenSpec change path, and the quality-gate checklist from CONTRIBUTING.md.
- CI status + release version badges in the README header.
- `package.json` now declares `repository`, `bugs`, `homepage`, `author`, `license`, and `keywords` so package-info widgets and search tooling can pick the project up.

## [1.0.0] — 2026-05-16

First public release. The full feature set is captured under [`openspec/specs/`](./openspec/specs/); this section is the high-level tour.

### AI engine

- **Per-repo classification** — every starred repo is analysed through a Title Case category + verb-led killer-feature prompt ([src/ai/prompts.ts](./src/ai/prompts.ts)). Bun-native OpenAI + Ollama providers behind a single [`AIProvider`](./src/ai/types.ts) seam.
- **Two-pass + chunked consolidation** — Pass 1 merges language-qualifier variants, Pass 2 budget-aware merges to the 32-list GitHub limit. Pass 2 chunks the input set (size 25) when large and runs a reducer pass to compose the chunk outputs; a hard `enforcebudget` safety net runs last regardless of model output.
- **AI-list-name awareness** — the system prompt includes the user's existing GitHub list names and explicit instructions to reuse them when the domain matches.
- **Singleton rerouting** — an extra AI call reroutes orphan single-repo "new" categories to better-matched existing/proposed lists, dropping junk creates.
- **Distribution context** — consolidation prompts include per-category repo counts + top-5 topics as a deterministic signal alongside the names.

### GitHub integration

- **Native lists, not third-party tags** — all writes go through the GitHub GraphQL list-mutation API (`createList`, `updateList`, `deleteList`, `updateUserLists`).
- **Star + list fetch** — `@octokit/graphql` with classic-PAT `user` + `repo` scope.
- **Human-in-the-loop review** — every accepted suggestion gets a TUI review pass before mutations run.
- **Reserved "Other" bucket** — one of 32 slots is always preserved as `Other`; never renamed, never deleted by the tool.
- **Archived repo routing** — archived starred repos are deterministically routed to an `Archived` bucket without an AI call.
- **Unlisted-repos scope** — opt into analysing only the repos that aren't already in some list.
- **Rename safety** — unlisted-only scope and the rename guard avoid mass renames when evidence is too thin (≤1 repo).

### TUI

- **Ink-based terminal UI** — keyboard-driven flow: confirm → strategy → analyse → review → summary → apply → save.
- **Consolidation strategies** — Keep existing _(default)_ / Re-create all / Allow rename.
- **Review keys** — `a` / `Enter` accept, `s` skip, `r` reject, `Ctrl+A` accept all, `q` / `Esc` quit (optional save).
- **ESC interrupt** — interrupt analysis mid-flight; user picks continue / save partial / exit.
- **Rename card** — preview the repos affected + rejection annotations + repo previews.
- **Default-key handling** — yes/no prompts have a sensible default (usually "no" for destructive actions, "yes" for save), so reflex-Enter doesn't apply destructive changes.

### Headless mode

- **`--analyze-only`** — runs fetch → analyse → consolidate → suggest, then emits a JSON document with `runId`, summary metrics, suggestions, and errors.
- **`--output <path>`** — pipe to a file instead of stdout.
- **`--limit <n>`** — cap analysis count; useful for smoke tests and prompt-iteration.
- **`--concurrency <n>`** — adjust the parallel README-fetch / analysis budget (default 5).
- **`--no-cache`** — bypass the analysis cache for one run.
- **`--no-analytics`** — disable PostHog product analytics for the run; the choice is persisted to user config.

### Performance & cost

- **SQLite analysis cache** — per-repo AI results are persisted at `.cache/analysis.db` keyed on `<repoId>:sha256(readme)`. Repeat runs converge to near-zero AI cost; cache is schema-versioned and self-heals if the DB file is unreadable (quarantines to `.broken.<timestamp>` and starts fresh).
- **README preprocessing** — strips badges, TOCs, image markup, sponsor banners; prefers Features / Key Features sections; caps at 4000 chars with `dataQuality = 'truncated'` signalling.

### Observability

- **Always-on JSONL file logging** — every run writes structured logs to `$XDG_STATE_HOME/gh-star-constellation-finder/app.log` (or `LOG_FILE`). Lifecycle, phase boundaries, user decisions, and failures are all captured. TUI mode never writes log lines to stdout/stderr (so Ink rendering stays clean); `--analyze-only` mode mirrors `warn` and `error` lines to stderr for AI-tool harnesses.
- **Langfuse prompt tracing (opt-in)** — phase spans (`analysis-phase`, `consolidation-phase`) and per-call generation spans (`analyze-<owner>/<name>`, `deduplicate-language-qualifiers`, `consolidate-categories[-chunk-N]`, `consolidate-categories-reduce`, `reroute-orphan-repos`) with milestone events and run-phase metrics. Activates when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` are set; no-ops cleanly otherwise.
- **PostHog product analytics (opt-in)** — fixed-set, non-PII events (run started, phase completed, suggestions applied) when `POSTHOG_API_KEY` is set, with a runtime-env-overrides-baked-default layering so the official binary can ship with telemetry while forks default to off.

### Distribution

- **Standalone single-file binaries** — `bun build --compile` for `linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, each with sourcemaps. Released via [`.github/workflows/release.yml`](./.github/workflows/release.yml) on `v*` tag push.
- **One-line install** — `curl -fsSL https://raw.githubusercontent.com/tkrisztian95/gh-star-constellation-finder/main/install.sh | bash` resolves OS + arch, drops the binary into `/usr/local/bin` or `~/.local/bin`.
- **PostHog key baking** — release-built binaries inline the project key at build time via `bun build --define`, so analytics are on by default in the official binary. Users can still override with `POSTHOG_API_KEY=...` or opt out with `--no-analytics`.

### Tooling

- **Bun-native** — toolchain is Bun + Husky + lint-staged + ESLint + Prettier + TypeScript. `bun run typecheck`, `lint`, `format:check`, `test`. Pre-commit hooks autoformat staged `src/**/*.{ts,tsx}` files.
- **OpenSpec workflow** — every non-trivial change has a folder under `openspec/changes/<slug>/` (`proposal.md`, `design.md`, `tasks.md`, `specs/`). Archived on completion to `openspec/changes/archive/<YYYY-MM-DD>-<slug>/` with spec deltas promoted into `openspec/specs/`.

[Unreleased]: https://github.com/tkrisztian95/gh-star-constellation-finder/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/tkrisztian95/gh-star-constellation-finder/releases/tag/v1.0.0
