# 🌌 gh-star-constellation-finder

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Stop hoarding stars. Start building constellations.**

`gh-star-constellation-finder` is an AI-powered Terminal User Interface (TUI) designed to rescue your GitHub stars from the "void." It analyzes your repositories using local or OpenAI models, proposing smart categorizations for your **native GitHub lists** based on actual code intent, health, and project depth.

## How it Works

In short: authenticate → fetch your starred repos + their READMEs → analyse each with AI (results cached locally) → consolidate categories (two AI passes) → generate suggestions → review and apply via the GitHub GraphQL API.

For a phase-by-phase walkthrough of the engine — prompt builders, consolidation algorithm, caching key, suggestion types, file pointers into the source — see [docs/ai-engine-workflow.md](docs/ai-engine-workflow.md).

## ✨ Key Features

- **TUI-First Experience:** A beautiful, keyboard-driven interface built with [Ink](https://github.com/vadimdemedes/ink).
- **Deep Analysis:** Goes beyond simple tags by reading repository `README.md` files to understand the "why" behind a project.
- **Native Integration:** Uses the GitHub GraphQL API to create and manage lists directly on your profile — no third-party database required.
- **Human-in-the-Loop:** Review AI-generated suggestions and insights before any changes are written to your account.
- **Health Audits:** Automatically flags archived repositories to help you declutter.
- **Reserved "Other" Bucket:** One of the 32 GitHub list slots is always reserved for an "Other" catch-all. Any repo that doesn't fit a specific category lands here instead of being forced into an ill-fitting group. The "Other" list is protected — it can never be renamed or deleted by the tool.
- **Persistent Analysis Cache:** Per-repo AI results are cached in a local SQLite DB keyed on README contents — re-runs only pay for repos whose README has changed. Disable with `--no-cache`.
- **Headless / Scriptable Mode:** Run with `--analyze-only` to skip the TUI and emit a JSON document to stdout for scripting or inspection.
- **Privacy by Default:** Both prompt tracing (Langfuse) and product analytics (PostHog) are strictly opt-in via env vars. With nothing configured, no telemetry leaves your machine.

## 🚀 Getting Started

### Prerequisites

- **Bun** (v1.0 or higher) — [install](https://bun.sh/)
- **GitHub Personal Access Token (PAT):** Requires `repo` and `user` scopes. Note: the `user` scope (not just `read:user`) is required for creating and managing GitHub Lists via the GraphQL API. Use a **classic token** — fine-grained tokens do not support this mutation.
- **AI Provider:** An OpenAI API Key OR [Ollama](https://ollama.com/) running locally (e.g., `llama3`).

### Installation

```bash
# Clone the repository
git clone https://github.com/tkrisztian95/gh-star-constellation-finder.git
cd gh-star-constellation-finder

# Install dependencies
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your GitHub token and AI provider credentials
```

### Running

```bash
bun run dev
```

Bun automatically loads `.env` — no extra flags needed.

## 🔄 TUI Workflow

The interactive mode walks you through these steps:

1. **Confirm** — shows how many starred repos will be analysed; press `y` to proceed.
2. **Strategy** — choose how existing GitHub Lists are handled (see [Consolidation Strategies](#consolidation-strategies) below).
3. **Fetch & Analyse** — READMEs are fetched concurrently and each repo is sent to the AI for categorization.
4. **Review** — browse every suggestion, accept or skip individual ones with keyboard shortcuts.
5. **Summary** — see a final diff of what will be created/updated before any writes happen.
6. **Apply** — accepted suggestions are written to GitHub via GraphQL mutations.
7. **Save** — optionally save the full session JSON (suggestions + decisions + mutation results) to a file. The default path is `output/<model>/session-<YYYYMMDD-HHMMSS>.json`.

### Review keyboard shortcuts

While reviewing suggestions:

| Key                             | Action                                                   |
| ------------------------------- | -------------------------------------------------------- |
| <kbd>a</kbd> / <kbd>Enter</kbd> | Accept the current suggestion (default)                  |
| <kbd>s</kbd>                    | Skip — don't apply, don't mark as rejected               |
| <kbd>r</kbd>                    | Reject — applied as feedback if the AI is asked to retry |
| <kbd>Ctrl+A</kbd>               | Accept all remaining suggestions at once                 |
| <kbd>q</kbd> / <kbd>Esc</kbd>   | Quit review (optionally save session before exit)        |

For yes/no prompts (confirm, apply, save), <kbd>Enter</kbd> picks the default — usually "no" for destructive actions, "yes" for save prompts. The exact default is shown highlighted in the prompt.

### Consolidation Strategies

After confirming, you pick one of three strategies that controls how the AI's proposed categories are merged with your existing lists:

| #   | Strategy                      | Behaviour                                                                   |
| --- | ----------------------------- | --------------------------------------------------------------------------- |
| 1   | **Keep existing** _(default)_ | Preserve all current lists; add new ones only for genuinely new categories. |
| 2   | **Re-create all**             | Delete every existing list, then build a fresh set from AI categories.      |
| 3   | **Allow rename**              | Keep existing lists but rename them when the AI suggests a better name.     |

## 🛠 CLI Flags

| Flag                | Default    | Description                                                                    |
| ------------------- | ---------- | ------------------------------------------------------------------------------ |
| `--backend <name>`  | `openai`   | AI backend to use (`openai` or `ollama`)                                       |
| `--limit <n>`       | _(all)_    | Limit the number of repos analysed                                             |
| `--concurrency <n>` | `5`        | Parallel README fetch concurrency                                              |
| `--analyze-only`    | off        | Headless mode — skip the TUI and print JSON to stdout                          |
| `--output <path>`   | _(stdout)_ | Write `--analyze-only` output to a file instead of stdout                      |
| `--no-cache`        | off        | Skip the local analysis cache — every repo is sent to the AI even if unchanged |
| `--no-analytics`    | off        | Disable PostHog product analytics for this run (also persisted to user config) |

### `--analyze-only` mode

Runs the full pipeline (fetch → analyse → consolidate → suggest) without launching the TUI, then exits:

```bash
# Print to stdout and pipe to jq
bun run dev -- --analyze-only --limit 20 | jq '.suggestions'

# Save to a file
bun run dev -- --analyze-only --output starred.json
```

> `--output` requires `--analyze-only`. No GitHub writes are performed in this mode.

Output shape:

```json
{
  "runId": "7bd948c8-...",
  "summary": {
    "starredCount": 312,
    "analyzedCount": 20,
    "suggestionCount": 14,
    "durationMs": 8431,
    "model": "gpt-4o-mini",
    "githubUser": "your-login"
  },
  "suggestions": [ ... ],
  "errors": [ ... ]
}
```

## ⚙️ Configuration

| Variable              | Required     | Description                                                                                                                                                                                               |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`        | ✅           | Classic PAT with `user` and `repo` scopes                                                                                                                                                                 |
| `OPENAI_API_KEY`      | One of these | OpenAI API key                                                                                                                                                                                            |
| `OLLAMA_HOST`         | One of these | Ollama base URL (default: `http://localhost:11434`)                                                                                                                                                       |
| `OLLAMA_MODEL`        | with Ollama  | Model name (e.g. `llama3`)                                                                                                                                                                                |
| `LANGFUSE_PUBLIC_KEY` | optional     | Langfuse public key (enables prompt tracing)                                                                                                                                                              |
| `LANGFUSE_SECRET_KEY` | optional     | Langfuse secret key                                                                                                                                                                                       |
| `LANGFUSE_BASE_URL`   | optional     | Custom Langfuse host (default: Langfuse cloud)                                                                                                                                                            |
| `POSTHOG_API_KEY`     | optional     | PostHog project key (`phc_...`) — enables product analytics. Unset = telemetry disabled                                                                                                                   |
| `POSTHOG_HOST`        | optional     | Custom PostHog host (default: `https://eu.i.posthog.com`)                                                                                                                                                 |
| `LOG_LEVEL`           | optional     | Log level: `debug`, `info`, `warn`, or `error` (default: `info`)                                                                                                                                          |
| `LOG_FILE`            | optional     | Log file path. Absolute, or relative (resolved against the project root — e.g. `LOG_FILE=app.log`). Default: `$XDG_STATE_HOME/gh-star-constellation-finder/app.log`, falling back to `~/.local/state/...` |

## 📓 Logging

The app writes structured JSONL logs to a file on every run. Logging is **always on** — only the level and path are configurable. In interactive TUI mode the logger never writes to stdout/stderr (so it can't corrupt Ink rendering); in `--analyze-only` headless mode, `warn` and `error` lines are also mirrored to stderr in a compact human-readable form for AI-tool harness use.

```bash
# tail the log live while running
tail -f app.log | jq .

# everything from this run, filtered to warn+
jq 'select(.level=="warn" or .level=="error")' app.log
```

What gets logged at the default `info` level:

- **Lifecycle:** app start (backend, headless flag, concurrency, limit), auth ok, exits
- **Phases:** stars+lists fetched, READMEs fetched, analysis start/end, consolidation, suggestions generated, review decisions, apply phase, session saved
- **User decisions:** confirm yes/no, scope picked, strategy picked, ESC interrupt, interrupt choice (continue/exit/save), summary apply yes/no, save prompt response
- **Failures:** auth errors, GitHub fetch failures, README fetch failures, individual mutation failures (`error`); rate-limit nearing, scope-token write-permission gap, analysis-failed repos (`warn`)

Per-repo analysis traces and per-mutation success lines are at `debug` level — set `LOG_LEVEL=debug` to capture them when reproducing a bug.

> AI call latency, token usage, and prompt content are NOT logged here — that's [Langfuse](#-prompt-tracing-optional)'s job. The two are complementary: Langfuse for AI-call tracing, the JSONL log for everything else.

## 🔍 Prompt Tracing (optional)

Prompt tracing captures each AI call — system prompt, user message, model, token usage, and latency — as a structured trace in [Langfuse](https://langfuse.com). It is strictly opt-in: if the env vars are absent the app behaves exactly as without this feature.

### Cloud setup

1. Sign up at [https://cloud.langfuse.com](https://cloud.langfuse.com) and create a project.
2. Copy the public and secret keys into your `.env`:

```
LANGFUSE_PUBLIC_KEY=pk-lf-...
LANGFUSE_SECRET_KEY=sk-lf-...
```

### Local setup with Docker

```bash
docker run --name langfuse \
  -e NEXTAUTH_SECRET=changeme \
  -e SALT=changeme \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/langfuse \
  -p 3000:3000 \
  langfuse/langfuse:latest
```

Then set `LANGFUSE_BASE_URL=http://localhost:3000` in your `.env`.

> Note: Ollama responses do not include token usage data, so the `usage` field will be omitted from Ollama traces.

## 💾 Analysis Cache

Each repo's AI analysis is cached in a local SQLite database at `.cache/analysis.db`. Re-running against the same starred set only sends repos whose README has changed back to the AI — repeat runs converge to near-zero AI cost.

- **Cache key:** `<repoId>:sha256(readme)`. When upstream edits a README, the next run re-analyses that repo automatically.
- **Schema versioned:** if the schema changes in a future release, the cache is rebuilt safely.
- **Self-healing:** if the DB file is unreadable (corrupted, partial write, wrong schema), it is quarantined to `analysis.db.broken.<timestamp>` and a fresh cache is started.
- **Disable per-run:** pass `--no-cache` to bypass entirely — useful for benchmarking, prompt-iteration runs, or forcing a fresh analysis.
- **Wipe:** delete `.cache/analysis.db` to start over.

The cache is gitignored — it's a local-only artefact and never leaves your machine.

## 📊 Product Analytics (optional)

Anonymous usage events (run started, phase completed, suggestions applied, etc.) can be sent to [PostHog](https://posthog.com) to help understand which flows are used and where they fail. Like prompt tracing, this is **strictly opt-in**: with `POSTHOG_API_KEY` unset, the analytics module no-ops and no events are emitted.

### Enable

1. Create a PostHog project and grab the project key (`phc_...`).
2. Add to your `.env`:

```
POSTHOG_API_KEY=phc_...
# POSTHOG_HOST=https://eu.i.posthog.com  # override for US cloud or self-hosted
```

> **Released binaries:** the official binaries published on GitHub Releases ship with the project's PostHog key baked in at build time (via `bun build --define`), so analytics are on by default in the released CLI. Setting `POSTHOG_API_KEY` at runtime overrides the baked default; `--no-analytics` turns it off entirely. Building from source (`bun run dev`, your own `bun build`) never bakes a key — it relies on the env var.

### Disable per run / persist opt-out

Pass `--no-analytics` on any run — the choice is persisted to user config so subsequent runs also stay off until you re-enable it manually.

### What's captured

A small, fixed set of named events with non-PII properties: backend name, mode (interactive vs `--analyze-only`), phase outcomes, suggestion counts, and decision aggregates. No repo names, no README contents, no GitHub login, no tokens. A stable per-install pseudo-random distinct ID is used (also persisted in user config) so a single user's events can be grouped without identifying them.

## 🧑‍💻 Development

Quality gates (also run in CI):

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src
bun run format:check # prettier --check src
bun run test         # bun test runner over src/__tests__
```

Husky + lint-staged run `prettier --write` and `eslint --fix` on staged `src/**/*.{ts,tsx}` files at commit time. Tests live in `src/__tests__/`. The AI provider and Octokit are mocked at the `AIProvider` / GraphQL-client seam — don't mock deeper than that.

### Planning changes with OpenSpec

Non-trivial changes are planned through [OpenSpec](https://github.com/Fission-AI/OpenSpec) before implementation. Each change gets a folder under `openspec/changes/<change-slug>/` containing `proposal.md`, `design.md`, `tasks.md`, and a `specs/` subtree. On completion the folder is archived under `openspec/changes/archive/<YYYY-MM-DD>-<slug>/` and the spec deltas are promoted into `openspec/specs/`. The promoted specs are the canonical source of truth for current behaviour — `openspec/specs/` is a good starting point for understanding the system in depth.

### Where things live

| Area                                                | Where                               |
| --------------------------------------------------- | ----------------------------------- |
| TUI entry / CLI flag parsing                        | `src/index.tsx`, `src/cli/`         |
| AI provider abstraction (OpenAI + Ollama)           | `src/ai/`                           |
| Analysis / consolidation / suggestion orchestration | `src/orchestration/`, `src/engine/` |
| GitHub fetch + mutate                               | `src/github/`, `src/graphql/`       |
| Ink components (screens, cards, prompts)            | `src/components/`                   |
| Phase state machine                                 | `src/state/`                        |
| Session JSON (analyze-only + interactive save)      | `src/session/`                      |
| Analysis cache (SQLite)                             | `src/cache/`                        |
| PostHog event capture                               | `src/analytics.ts`                  |
| Structured file logging                             | `src/logger.ts`                     |
| Tests                                               | `src/__tests__/*.test.ts`           |

### License

[MIT](./LICENSE).
