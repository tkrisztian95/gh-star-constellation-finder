# 🌌 gh-star-constellation-finder

[![CI](https://img.shields.io/github/actions/workflow/status/tkrisztian95/gh-star-constellation-finder/build.yml?branch=main&style=flat-square&label=ci)](https://github.com/tkrisztian95/gh-star-constellation-finder/actions/workflows/build.yml)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=tkrisztian95_gh-star-constellation-finder&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=tkrisztian95_gh-star-constellation-finder)
[![Release](https://img.shields.io/github/v/release/tkrisztian95/gh-star-constellation-finder?style=flat-square)](https://github.com/tkrisztian95/gh-star-constellation-finder/releases/latest)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Turn your GitHub stars into a local-first knowledge base.**

`gh-star-constellation-finder` analyses your GitHub stars into a **local-first knowledge base**. It fetches every repo you've starred, reads its README, and runs it through a local or OpenAI model — capturing each project's intent, health, depth, and **technical entities** into a **SQLite cache on your machine**. That corpus already powers an **AI categorizer** (native GitHub Lists), can be exported as a portable `corpus.json` (`--export-corpus`), and is the substrate for the **entity "constellation"** — repos linked by the tech they share ([v0.3.0](docs/milestone-v0.3.0.md)). Making it directly queryable — `--ask`, semantic search, an MCP server — is the [v0.2.0 roadmap](docs/milestone-v0.2.0.md), tracked in the open.

> **Status:** the categorizer, analysis cache, per-repo **entity extraction** (swappable LLM / GLiNER seam — see [docs/entity-extraction.md](docs/entity-extraction.md)), the **eval harness** (`bun run evals`), and **`--export-corpus`** have shipped. The retrieval surfaces (`--ask`, search, MCP) and the constellation graph are roadmap — see [docs/milestone-v0.2.0.md](docs/milestone-v0.2.0.md) and [docs/milestone-v0.3.0.md](docs/milestone-v0.3.0.md).

![Review screen: an AI-generated suggestion proposing to move a repo into the "Curated Software Resources" list, with keyboard shortcuts for accept / skip / reject / quit](docs/screenshots/review-phase-cropped.png)

## Table of contents

- [How it Works](#how-it-works)
- [⚠️ Disclaimer](#%EF%B8%8F-disclaimer)
- [✨ Key Features](#-key-features)
- [🚀 Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running](#running)
- [🔄 TUI Workflow](#-tui-workflow)
  - [Review keyboard shortcuts](#review-keyboard-shortcuts)
  - [Consolidation Strategies](#consolidation-strategies)
- [🛠 CLI Flags](#-cli-flags)
  - [`--analyze-only` mode](#--analyze-only-mode)
- [🌌 Constellation (entity graph)](#-constellation-entity-graph)
- [⚙️ Configuration](#%EF%B8%8F-configuration)
- [📓 Logging](#-logging)
- [🔍 Prompt Tracing (optional)](#-prompt-tracing-optional)
  - [Cloud setup](#cloud-setup)
  - [Local setup with Docker](#local-setup-with-docker)
- [💾 Analysis Cache](#-analysis-cache)
- [📊 Product Analytics (optional)](#-product-analytics-optional)
  - [Enable](#enable)
  - [Disable per run / persist opt-out](#disable-per-run--persist-opt-out)
  - [What's captured](#whats-captured)
- [🧑‍💻 Development](#-development)
  - [Planning changes with OpenSpec](#planning-changes-with-openspec)
  - [Where things live](#where-things-live)
  - [License](#license)

Also see [CONTRIBUTING.md](./CONTRIBUTING.md), [SECURITY.md](./SECURITY.md), [CHANGELOG.md](./CHANGELOG.md), the engine deep-dive in [docs/ai-engine-workflow.md](./docs/ai-engine-workflow.md), and the [entity-extraction architecture](./docs/entity-extraction.md) (the swappable LLM / GLiNER / hybrid seam behind the v0.3.0 constellation).

## How it Works

In short: authenticate → fetch your starred repos + their READMEs → analyse each with AI (results cached locally) → consolidate categories (two AI passes) → generate suggestions → review and apply via the GitHub GraphQL API.

For a phase-by-phase walkthrough of the engine — prompt builders, consolidation algorithm, caching key, suggestion types, file pointers into the source — see [docs/ai-engine-workflow.md](docs/ai-engine-workflow.md).

## ⚠️ Disclaimer

This tool is provided **as is, with no warranty**, under the [MIT License](./LICENSE). Before you run it against your account, know what it does:

- **It mutates real GitHub state.** Accepted suggestions create, rename, and delete lists, and move starred repos between them, via authenticated GraphQL mutations. There is no built-in undo — GitHub doesn't keep a history of list memberships. Decide what you'd lose before you accept anything.
- **AI suggestions are best-effort.** The model is asked to classify based on description, language, topics, and a README excerpt. It can be wrong, inconsistent, or miss context. You are the reviewer; every suggestion goes through the TUI review step (or the `--analyze-only` JSON) before any write happens.
- **External services see your repo metadata.** When using the OpenAI backend, the repo name, description, language, topics, and a preprocessed README excerpt (capped at 4 000 chars) are sent to the OpenAI API. Use `--backend ollama` for fully local inference if that matters to you. Public README content is, by definition, already public; private-repo READMEs go through the same path if you have any starred.
- **You own the outcome.** Neither the author nor any contributor is liable for lost lists, mis-categorised repos, accidental deletes, exceeded GitHub or OpenAI rate limits, or any other consequence of using this tool. Start with `--analyze-only` or `--limit <small N>` if you're unsure.

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

   ![Analysis phase: a step indicator showing "3 Analyze" with the spinner on the current repo and an ESC-to-interrupt hint](docs/screenshots/analyze-phase.png)

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
| `--export-corpus <path>` | _(off)_ | Headless — analyse your stars and write a `corpus.json` (the cross-project contract: repo metadata + analysis + entities), then exit |
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

## 🌌 Constellation (entity graph)

Beyond categorising, the tool extracts **technical entities** per repo and links
repos that share them into a graph — your stars as a constellation. See
[docs/entity-extraction.md](./docs/entity-extraction.md) for the architecture.

![Star constellation — starred repos linked by shared technical entities, coloured by community, with a min-edge-weight slider and per-repo related list](docs/screenshots/constellation.png)

*`--serve` web view: repos linked by shared tech, coloured by community. Sliders tune edge-weight threshold and how tightly clusters pull together; hover a repo for its related stars.*

```bash
# 1. Build the graph from your stars (entities are extracted during analysis).
#    --limit keeps it quick; drop it for all your stars. --entity-source readme|description.
GITHUB_TOKEN=ghp_xxx OLLAMA_MODEL=llama3 bun run dev -- \
  --backend ollama --limit 40 --constellation out
#    → out/constellation.gexf (Gephi) + out/constellation.json

# 2. Explore it in the browser (offline; no token/model needed):
bun run dev -- --serve out/constellation.json     # http://localhost:4477
#    interactive force graph, community-coloured, with a min-edge-weight slider.

# 3. Or query it from an AI agent over MCP:
CONSTELLATION_PATH=out/constellation.json bun run mcp
#    tools: related_stars(repo, k), list_stars()
```

Inspect the raw graph:

```bash
jq '{nodes:(.nodes|length), edges:(.edges|length)}' out/constellation.json
jq '.edges | sort_by(-.weight)[0:5]' out/constellation.json   # strongest links + shared entities
```

MCP client config (Claude Desktop / Cursor / Cline):

```json
{
  "mcpServers": {
    "star-constellation": {
      "command": "bun",
      "args": ["run", "mcp"],
      "cwd": "/path/to/gh-star-constellation-finder",
      "env": { "CONSTELLATION_PATH": "out/constellation.json" }
    }
  }
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

## 🎯 Retrieval Evals

As the project grows a retrieval layer ("ask a question, get the right starred repos back"), `bun run evals` measures how good that search is — with a number, so changes can be judged instead of guessed. It is a graded scorecard, not a pass/fail test.

```bash
bun run evals            # score the baseline retriever, write evals/baseline.json
bun run evals --check    # reproduce the committed baseline; non-zero on drift (CI gate)
bun run evals --k 10     # change the cutoff (default 5)
```

It runs fully offline against committed fixtures — no GitHub token, no AI backend, no network:

- **`evals/corpus.json`** — a frozen snapshot of well-known public repos and their analysis (the haystack search digs through).
- **`evals/queries.json`** — hand-authored questions, each mapping to one or more ground-truth repo URLs that must exist in the corpus.
- **`evals/baseline.json`** — the score today's keyword retriever achieves; the floor a smarter retriever must beat.

**Reading the scorecard:**

- **precision@5** — of the 5 repos returned, how many were correct.
- **recall@5** — of all correct answers, how many landed in the top 5 (matters when a question has several right repos).
- **MRR** — how high the first correct answer ranked (1.0 = always first).
- **no-answer rate** — how often search returned nothing.

**Adding a golden query** is a single-PR change with no code: add one entry to `evals/queries.json` (`question` + `expected` repo URLs already present in the corpus), re-run `bun run evals` to refresh `evals/baseline.json`, and commit both. To refresh the corpus itself, run `bun run evals:build-corpus` (this one needs `GITHUB_TOKEN` + an AI backend).

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

Looking to file an issue or open a PR? See [CONTRIBUTING.md](./CONTRIBUTING.md) for the issue-creation guide, label taxonomy, and PR workflow. The rest of this section covers what you need to run the codebase locally.

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
