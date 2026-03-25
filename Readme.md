# 🌌 gh-star-constellation-finder

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Stop hoarding stars. Start building constellations.**

`gh-star-constellation-finder` is an AI-powered Terminal User Interface (TUI) designed to rescue your GitHub stars from the "void." It analyzes your repositories using local or OpenAI models, proposing smart categorizations for your **native GitHub lists** based on actual code intent, health, and project depth.

## ✨ Key Features

* **TUI-First Experience:** A beautiful, keyboard-driven interface built with [Ink](https://github.com/vadimdemedes/ink).
* **Deep Analysis:** Goes beyond simple tags by reading repository `README.md` files to understand the "why" behind a project.
* **Native Integration:** Uses the GitHub GraphQL API to create and manage lists directly on your profile—no third-party database required.
* **Human-in-the-Loop:** View AI-generated "Proposals" and "Insights" before committing any changes to your account.
* **Health Audits:** Automatically flags "stale" or archived repositories to help you declutter.
* **Headless / Scriptable Mode:** Run with `--analyze-only` to skip the TUI and emit a JSON document (analysis + suggestions + run ID) to stdout for scripting or inspection.

## 🚀 Getting Started

### Prerequisites

* **Bun** (v1.0 or higher) — [install](https://bun.sh/)
* **GitHub Personal Access Token (PAT):** Requires `repo` and `user` scopes. Note: the `user` scope (not just `read:user`) is required for creating and managing GitHub Lists via the GraphQL API. Use a **classic token** — fine-grained tokens do not support this mutation.
* **AI Provider:** An OpenAI API Key OR [Ollama](https://ollama.com/) running locally (e.g., `llama3`).

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/gh-star-constellation-finder.git

# Install dependencies
cd gh-star-constellation-finder
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

## 🛠 CLI Flags

| Flag | Default | Description |
|---|---|---|
| `--backend <name>` | `openai` | AI backend to use (`openai` or `ollama`) |
| `--limit <n>` | _(all)_ | Limit the number of repos analysed |
| `--concurrency <n>` | `5` | Parallel README fetch concurrency |
| `--analyze-only` | off | Headless mode — skip the TUI and print JSON to stdout |

### `--analyze-only` mode

Runs the full analysis pipeline (fetch → analyse → consolidate → suggest) without rendering the interactive TUI, then prints a single JSON document to stdout and exits:

```bash
bun run dev -- --analyze-only --limit 20 | jq '.suggestions'
```

Output shape:

```json
{
  "runId": "7bd948c8-...",
  "analyzedRepos": [
    {
      "repo": { "id": "...", "name": "...", "owner": "...", ... },
      "analysis": { "category": "...", "killerFeature": "...", "dataQuality": "..." }
    }
  ],
  "suggestions": [ ... ]
}
```

Compatible with `--backend` and `--limit`. No GitHub writes are performed in this mode.

## ⚙️ Configuration

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | ✅ | Classic PAT with `user` and `repo` scopes |
| `OPENAI_API_KEY` | One of these | OpenAI API key |
| `OLLAMA_HOST` | One of these | Ollama base URL (default: `http://localhost:11434`) |
| `OLLAMA_MODEL` | with Ollama | Model name (e.g. `llama3`) |
| `LANGFUSE_PUBLIC_KEY` | optional | Langfuse public key (enables prompt tracing) |
| `LANGFUSE_SECRET_KEY` | optional | Langfuse secret key |
| `LANGFUSE_BASE_URL` | optional | Custom Langfuse host (default: Langfuse cloud) |

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