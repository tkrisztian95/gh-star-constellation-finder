## 1. Project Structure & Config

- [ ] 1.1 Create `tsconfig.json` with `"module": "NodeNext"`, `"moduleResolution": "NodeNext"`, `"outDir": "dist"`, `"jsx": "react"`, and strict mode
- [ ] 1.2 Create `src/types.ts` defining shared types: `Repo`, `GitHubList`, `AnalysisResult`, `Suggestion`, `SuggestionType`
- [ ] 1.3 Create `.env.example` documenting `GITHUB_TOKEN`, `OPENAI_API_KEY`, and `OLLAMA_HOST`
- [ ] 1.4 Add `"dev": "tsx src/index.tsx"` script to `package.json`

## 2. GitHub Authentication

- [ ] 2.1 Create `src/github/auth.ts`: read `GITHUB_TOKEN` from env, throw clear error if missing (spec: `github-auth`)
- [ ] 2.2 Add a lightweight `viewer { login }` GraphQL validation call using `@octokit/graphql`; catch 401 with human-readable error
- [ ] 2.3 Check response headers for missing write scopes and emit a console warning before entering the TUI

## 3. Star Fetcher

- [ ] 3.1 Create `src/graphql/queries.ts` with the `starredRepositories` paginated GraphQL query (name, owner, description, language, stargazerCount, repositoryTopics, list memberships)
- [ ] 3.2 Add `viewer.lists` GraphQL query to fetch all user Lists with `id`, `name`, `description`, and member repo node IDs
- [ ] 3.3 Implement cursor-based paginator in `src/github/starFetcher.ts` that follows `pageInfo.endCursor` until `hasNextPage` is false
- [ ] 3.4 Add rate-limit guard: check `x-ratelimit-remaining` header and pause with a logged countdown when below 50

## 4. README Fetcher

- [ ] 4.1 Create `src/github/readmeFetcher.ts`: fetch `GET /repos/{owner}/{repo}/readme` via `fetch` with `Authorization` header; decode base64 content
- [ ] 4.2 Handle 404 (no README) gracefully — return empty string
- [ ] 4.3 Implement truncation: `content.slice(0, 4000)` + append `"... [truncated]"` when over limit
- [ ] 4.4 Implement async semaphore (or `p-limit`) for configurable concurrency (default 5) across all README fetches

## 5. AI Analyzer

- [ ] 5.1 Create `src/ai/types.ts` with `RepoInput` and `AnalysisResult` types and `Analyzer` interface: `analyze(input: RepoInput): Promise<AnalysisResult>`
- [ ] 5.2 Create `src/ai/openaiAnalyzer.ts`: use the `openai` npm package with `gpt-4o-mini`, `response_format: { type: "json_object" }`, and the specified system prompt
- [ ] 5.3 Create `src/ai/ollamaAnalyzer.ts`: POST to `OLLAMA_HOST/api/chat` with the system prompt and a JSON-requesting user message; parse the response body
- [ ] 5.4 Implement JSON response parser using `zod` schema `{ category: z.string(), killerFeature: z.string() }`; fall back to raw text on parse failure with a warning
- [ ] 5.5 Create `src/ai/index.ts`: export `createAnalyzer(backend: 'openai' | 'ollama'): Analyzer` factory; auto-detect backend from env vars if not specified via CLI arg

## 6. Suggestion Engine

- [ ] 6.1 Create `src/engine/suggestionEngine.ts`: accept analyzed repos + existing Lists, return typed `Suggestion[]`
- [ ] 6.2 Implement case-insensitive List name matching: if AI category matches an existing List name, emit `move-to-list`; otherwise emit `create-list`
- [ ] 6.3 Deduplicate `create-list` suggestions: track pending new Lists in a `Map<string, string>`; subsequent repos targeting the same category get `move-to-list` referencing the pending List
- [ ] 6.4 Skip repos already assigned to a matching List
- [ ] 6.5 Return suggestion count alongside the array for pre-review display

## 7. TUI — Loading Screen

- [ ] 7.1 Create `src/components/LoadingScreen.tsx`: Ink component showing a spinner (using `ink-spinner` or a custom interval) and `"Analyzing X / N repositories..."`
- [ ] 7.2 Stream progress updates via a shared async generator or callback passed down from `index.tsx` so the counter increments as each repo completes

## 8. TUI — Review Screen

- [ ] 8.1 Create `src/components/ReviewScreen.tsx`: display one `Suggestion` at a time with repo name, language, current lists, proposed category, killer feature, suggestion type, and proposed action
- [ ] 8.2 Add `"Suggestion X of N"` progress line in the header using Ink `<Text>`
- [ ] 8.3 Use `useInput` from Ink to handle key bindings: `a`/`Enter` → accept, `s` → skip, `r` → reject, `q`/`Ctrl+C` → quit prompt
- [ ] 8.4 Implement quit confirmation prompt: `"Apply N accepted suggestion(s) before quitting? [y/N]"` rendered as a sub-component
- [ ] 8.5 Implement `SummaryScreen.tsx`: display accepted/skipped/rejected counts and `"Apply these N changes? [y/N]"` confirmation before mutating

## 9. GitHub Mutator

- [ ] 9.1 Create `src/graphql/mutations.ts` with `createList` and `addStarredRepositoriesToList` GraphQL mutations
- [ ] 9.2 Create `src/github/mutator.ts`: execute mutations via `@octokit/graphql`, store newly created List IDs for chained move suggestions
- [ ] 9.3 Guard all mutations behind the final user confirmation — no API calls before `SummaryScreen` confirmation
- [ ] 9.4 Display per-mutation result inline in the TUI: `"✓ Moved <repo> to <list>"` or an error message
- [ ] 9.5 Print final session summary (succeeded / failed / skipped); call `process.exit(1)` if any mutation failed

## 10. Entrypoint & Integration

- [ ] 10.1 Rewrite `src/index.tsx` to wire all modules: auth → fetch stars+lists → fetch READMEs → analyze → generate suggestions → TUI (loading → review → summary → mutate)
- [ ] 10.2 Parse CLI args (`process.argv`): `--backend openai|ollama`, `--limit N`, `--concurrency N`
- [ ] 10.3 Display estimated AI call count before analysis starts; prompt `"Proceed? [y/N]"` using a simple `readline` call before entering the Ink TUI
- [ ] 10.4 Add a basic integration test (`src/__tests__/suggestionEngine.test.ts`) with mocked repo + list data asserting correct suggestion types and deduplication
