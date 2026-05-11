## Context

GitHub's starred repository feature has no built-in intelligence — users accumulate hundreds of repos with no automatic organization. GitHub Lists exist as the native grouping primitive but require manual curation. A PoC already exists in `src/index.tsx` using TypeScript, Ink v5, and React 18 with mock data. This project replaces the mock with real GitHub GraphQL/REST API calls and OpenAI/Ollama analysis, wired into a production-ready Ink TUI. The app runs locally, keeps secrets in environment variables, and applies no changes without explicit user confirmation.

## Goals / Non-Goals

**Goals:**
- Fetch all starred repos + Lists metadata for the authenticated user via GitHub GraphQL
- Retrieve and safely truncate README content to avoid oversized AI payloads
- Analyze each repo via OpenAI API (or local Ollama) with a compact, structured system prompt
- Generate typed suggestions (create-list, move-to-list) and present them interactively in the TUI
- Apply only user-accepted mutations via GitHub GraphQL

**Non-Goals:**
- Bulk auto-apply without confirmation
- Syncing or modifying stars themselves (only List membership changes)
- Web UI or non-terminal interface
- Multi-user or server deployment
- Support for organizations' starred repos (only authenticated user's stars)

## Decisions

### Decision: Ink + React as TUI framework
**Chosen:** `ink` v5 + `react` 18 (already in `package.json`)
**Alternatives:** Bubble Tea (Go), `blessed`, raw readline
**Rationale:** The project already has a working Ink PoC in `src/index.tsx`. Ink's React component model maps directly to familiar patterns and makes async state management with `useState`/`useEffect` straightforward. React's component tree cleanly separates loading, review, and summary screens without a bespoke state machine.

### Decision: GitHub GraphQL for starred repos and Lists
**Chosen:** GitHub GraphQL API v4 (`api.github.com/graphql`)
**Alternatives:** GitHub REST API v3
**Rationale:** REST has no endpoint for GitHub Lists. The `viewer.starredRepositories` + `lists` node is only available via GraphQL. REST is still used for README fetching (`/repos/{owner}/{repo}/readme`) since GraphQL has no blob content query for arbitrary files.

### Decision: README truncation strategy
**Chosen:** Fetch README via REST, base64-decode, truncate to first 4000 characters
**Alternatives:** Token-count-based truncation, LLM summarization pass, skip README entirely
**Rationale:** 4000 chars is roughly 1000 tokens — sufficient to capture project description, features, and install steps while keeping costs predictable. A fixed character limit is simple, deterministic, and language-agnostic. If the README is absent or errors, fall back to description + topics only.

### Decision: AI backend abstraction
**Chosen:** TypeScript `Analyzer` interface with two implementations: `OpenAIAnalyzer` (via the `openai` npm package, already in `package.json`) and `OllamaAnalyzer` (native `fetch` against `OLLAMA_HOST`)
**Alternatives:** Only OpenAI, LangChain/LlamaIndex framework
**Rationale:** Many developers run Llama 3 or Mistral locally. Supporting Ollama makes the tool free to use offline. The interface is a simple async function `analyze(input: RepoInput): Promise<AnalysisResult>` so switching backends requires no changes to the suggestion engine.

### Decision: System prompt design
**Chosen:** Single compact system prompt: `"You are a technical librarian. Analyze the provided README content. Categorize it into a short 2-3 word topic (e.g., 'Vector Databases' or 'Rust CLI Tools') and provide one 'Killer Feature' in under 10 words."`
**Alternatives:** Few-shot prompting with examples, multi-turn conversation, JSON mode
**Rationale:** Output must be concise for TUI display. The prompt is opinionated by design — short topic + one killer feature fits one terminal line. JSON structured output (OpenAI `response_format: json_object`) will be used to parse the response reliably.

### Decision: Suggestion presentation flow
**Chosen:** One suggestion at a time, full-screen review panel; j/k or arrow navigation for accept/skip/reject
**Alternatives:** Bulk select checklist, auto-accept with undo log
**Rationale:** Destructive List mutations should be deliberate. Full-screen focus prevents misclicks. Skipped items are not re-shown; rejected items are logged but not applied.

### Decision: Secret management
**Chosen:** Environment variables (`GITHUB_TOKEN`, `OPENAI_API_KEY`, `OLLAMA_HOST`)
**Alternatives:** OS keychain, config file, OAuth device flow
**Rationale:** Env vars are the lowest-friction approach for a CLI tool. PAT creation is documented; OAuth device flow adds complexity without clear benefit for a personal tool.

## Risks / Trade-offs

- **GitHub rate limits** → README fetching is one REST call per repo; for users with 1000+ stars this will hit the 5000 req/hour limit. Mitigation: batch with a configurable concurrency limit (default 5 concurrent `fetch` calls via a semaphore utility) and honor `Retry-After` headers.
- **AI cost unpredictability** → Each repo analysis is one API call. Mitigation: show estimated call count before starting, allow `--limit N` flag to process only N repos per session.
- **README parse quality** → Some READMEs are poorly structured or non-English. Mitigation: the AI prompt is robust to low-quality input; worst case the category is generic ("General Utility").
- **GitHub Lists API stability** → GitHub Lists via GraphQL is a relatively new feature and may change. Mitigation: isolate all GraphQL queries/mutations in `src/graphql/`; failures surface cleanly with the raw GraphQL error from `@octokit/graphql`.
- **Local model quality** → Ollama models may produce less structured output than GPT-4o. Mitigation: response parsing is lenient; if JSON parse fails, fall back to raw text displayed as-is with a warning.

## Migration Plan

The PoC `src/index.tsx` is replaced in-place with the production implementation. No data migration needed. Users run `npm start` (compiles TypeScript, then executes `dist/index.js`) or `npx tsx src/index.tsx` for development. Env vars are set before invocation.

## Open Questions

- Should the TUI support batch mode (non-interactive JSON output of suggestions) for CI/script use?
- Is there value in caching analysis results locally (e.g., SQLite) to avoid re-analyzing unchanged repos across sessions?
- Should we support GitHub App authentication in addition to PAT for teams?
