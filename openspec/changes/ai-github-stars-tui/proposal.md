## Why

GitHub stars accumulate fast but the native interface offers no intelligent organization — repos pile up unsorted and go unremembered. This TUI rescues starred repositories from obscurity by using AI to analyze their actual content and propose meaningful categorizations into GitHub's native Lists, entirely from the terminal.

## What Changes

- Introduce a full-featured terminal UI (Ink + React) that authenticates with GitHub and fetches starred repos with their Lists metadata via GraphQL
- Fetch README content per repo (truncated to avoid token limits) and analyze it with OpenAI or a local model using a compact system prompt
- Generate actionable suggestions: create a new GitHub List, move a repo between Lists, or update a List description
- Present each suggestion to the user for accept/reject/skip before applying any change via GitHub API
- Support both OpenAI API and a local model backend (e.g., Ollama) for offline or cost-conscious usage

## Capabilities

### New Capabilities

- `github-auth`: Authenticate with GitHub using a personal access token, validate scopes, store securely for session use
- `star-fetcher`: Fetch all starred repositories with metadata (name, description, topics, language, stars, Lists membership) via GitHub GraphQL API
- `readme-fetcher`: Fetch and truncate README content per repo from GitHub REST API, with size guards to avoid oversized payloads
- `ai-analyzer`: Send repo metadata + truncated README to OpenAI or local model with a compact system prompt; parse structured category + killer-feature response
- `suggestion-engine`: Aggregate AI analysis results into typed suggestions (create-list, move-to-list, edit-list); deduplicate and rank
- `tui-review`: Interactive Ink/React TUI that presents suggestions one-by-one; user accepts, skips, or rejects each before any mutation
- `github-mutator`: Apply accepted suggestions to GitHub via GraphQL mutations (create List, add/move repo to List)

### Modified Capabilities

## Impact

- Builds on the existing TypeScript + Ink v5 + React 18 PoC in `src/index.tsx`; existing dependencies (`ink`, `@octokit/graphql`, `openai`, `zod`) are already installed
- Replaces mock data in the PoC with real GitHub GraphQL calls and OpenAI/Ollama analysis
- Adds new source files under `src/` (components, graphql queries, ai, engine modules)
- Requires GitHub PAT with `read:user`, `user` (for Lists write) scopes and optionally `OPENAI_API_KEY`
- `tsx` is used for development execution; `tsc` + `node dist/index.js` for production
