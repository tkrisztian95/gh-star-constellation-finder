# Agent Guidelines

Always check `openspec/specs/` for existing requirements and history, `openspec/changes/` for what is planned or in progress, and the GitHub issue tracker (`gh issue list --repo tkrisztian95/gh-star-constellation-finder`) for the triaged backlog.

## Workflow: idea → issue → spec → branch → PR

Every non-trivial change in this repo follows the same five-step pipeline. Skipping steps is fine for typo fixes; for anything else, do them in order.

1. **Capture the idea.** Add a one-line entry to `docs/ideas.md` while it's fresh. Don't open an issue yet — `docs/ideas.md` is the rough inbox, the GitHub issue tracker is the triaged queue.
2. **File the GitHub issue.** Use the `/issues-from-ideas` skill (see [.claude/skills/issues-from-ideas/SKILL.md](.claude/skills/issues-from-ideas/SKILL.md)) to convert lines in `docs/ideas.md` into issues with cleaned titles, verbatim bodies, and labels from the project taxonomy (`area:*` + one of `bug` / `enhancement` / `documentation` / `type:*`). After issues are filed, empty `docs/ideas.md` — the tracker is now the source of truth.
3. **Propose the OpenSpec change.** Run `/opsx:propose` against the issue. The first line of `proposal.md` MUST reference the issue: `Tracks #<N>` (or `Tracks #<N>, #<M>` for bundled work). The change slug should be obviously related to the issue's intent — they don't have to be identical strings, but the chain `issue ↔ change folder ↔ branch ↔ PR` must be trivially greppable.
4. **Branch and implement.** Create the branch from `main` using the change slug verbatim as the branch name (see "Branches & git workflow"). **Commit the proposal artifacts first** — `proposal.md`, `design.md`, `tasks.md`, and the `specs/` subtree — as a single `docs(<slug>): propose <slug>` commit *before* running `/opsx:apply`. Then work through `tasks.md` with `/opsx:apply`, committing per numbered task section.
5. **Open the PR, link the issue, archive on merge.**
   - PR title: same style as commit subjects, e.g. `feat(cache-analysis-results): cache module + reuse`.
   - PR body MUST end with `Closes #<N>` (or `Closes #<N>, closes #<M>`) so GitHub auto-closes the issue on merge.
   - Run `/opsx:archive` as the final commit on the branch (`chore(openspec): archive <slug>`) — it lands inside the same PR.
   - Squash-merge for single-section changes; normal merge for multi-section changes so per-section commits survive for bisecting.

**One issue per change, one change per branch, one branch per PR.** Bundling unrelated issues into one PR makes review and rollback harder. If two issues genuinely share implementation, file a single change that lists both with `Tracks #N, #M` / `Closes #N, closes #M`.

## Stack

- **Runtime / toolchain:** [Bun](https://bun.sh) — use `bun run` / `bun install`, never `npm` or `node`. Entry point is `src/index.tsx` (Ink renders directly).
- **TUI:** [Ink](https://github.com/vadimdemedes/ink) + React 18. The app runs in the terminal — there is no DOM. Do not import from `react-dom` and do not reach for browser-only APIs.
- **AI providers:** OpenAI and Ollama, both behind the `AIProvider` interface in `src/ai/`. Backend is selected at runtime (`--backend` flag, `OPENAI_API_KEY` / `OLLAMA_HOST` env vars). Never call provider SDKs directly from orchestration or UI — always go through the provider abstraction.
- **GitHub API:** [`@octokit/graphql`](https://github.com/octokit/graphql.js) only. The classic-PAT `user` + `repo` scope assumption is load-bearing for the lists mutation — do not switch to fine-grained tokens.
- **Validation:** `zod` at every external boundary (AI response parsing, JSON-from-disk loading, CLI args). Inside the app, trust the parsed types and don't re-validate.
- **Observability:** Langfuse for prompt tracing and PostHog (`posthog-node`) for product analytics — both **opt-in via env vars**. Code paths must no-op cleanly when env vars are absent (the app must run identically without them).

## Project conventions

- **One component per file.** Sub-components extracted from a screen live in their own file under `src/components/`. Do not define helper Ink components inline in orchestration modules.
- **Keep business logic out of components.** Orchestration and state transitions belong in `src/orchestration/` and `src/state/`; components render and dispatch.
- **"Other" bucket is sacred.** One of the 32 GitHub list slots is reserved for `Other`. It must never be renamed or deleted by suggestion generation or the mutator. If you touch suggestion logic, re-verify this guarantee.
- **Headless parity.** Anything that changes the suggestion pipeline (`src/orchestration/analysis.ts`, `src/engine/`, `src/ai/`) must work identically in both interactive TUI mode and `--analyze-only` headless mode. The two paths share the same engine — keep it that way.
- **No emojis as functional UI.** Decorative emojis in README/docs are fine. Inside the TUI, use Ink text styling, not emoji glyphs, to convey state.
- **`.env` only — never commit secrets.** Bun loads `.env` automatically. Local files like `.env.local` are gitignored.

## Planning changes with OpenSpec

Use **OpenSpec** to plan non-trivial changes before implementing them.

| Slash command   | When to use                                                                       |
| --------------- | --------------------------------------------------------------------------------- |
| `/opsx:propose` | Start here — describe what you want to build, get a proposal + design + task list |
| `/opsx:apply`   | Work through the generated tasks one by one                                       |
| `/opsx:explore` | Think through a problem or clarify requirements before proposing                  |
| `/opsx:archive` | Mark a change as done after implementation is complete                            |

Active change artifacts live in `openspec/changes/<change-slug>/` and include `proposal.md`, `design.md`, `tasks.md`, and a `specs/` subtree. On archive, the folder moves to `openspec/changes/archive/<YYYY-MM-DD>-<change-slug>/` and the spec deltas are promoted into `openspec/specs/`.

### Best practices

- **Split complex tasks:** If a task is too large or ambiguous, break it into smaller steps — propose first, then apply, then archive. Avoids context overload and implementation drift.
- **Commit the proposal before applying:** After `/opsx:propose` generates the change folder and *before* you touch any source code with `/opsx:apply`, stage and commit the entire `openspec/changes/<slug>/` tree as `docs(<slug>): propose <slug>`. This pins the originally agreed-upon scope into git history, makes reviewer diffs clean (spec lands separately from implementation), and gives you a stable revert point if the implementation goes sideways. Do this on the change branch, not on `main`.
- **Commit after each task section during `/opsx:apply`:** When working through `tasks.md`, create a git commit at the end of every numbered task group (each `## N. <Group Name>` section) — once every checkbox in that group is marked `[x]` and the work is verified. Subject line should reference the change slug and the section, e.g. `feat(cache-analysis-results): cache module (tasks 1.x)`. Keeps the branch reviewable in slices that match the spec, makes bisecting easy, prevents one giant end-of-change commit. Do **not** commit mid-section unless the user asks — wait until the section is fully done. The final `/opsx:archive` commit then carries only the spec-archive move plus any leftover doc edits.
- **Commit after archiving:** `/opsx:archive` produces a single `chore(openspec): archive <change-slug>` commit that moves the change folder into `archive/<date>-<slug>/` and promotes the spec deltas. Mirrors the existing history (`git log --oneline | grep "archive"`).
- **Validate specs before applying:** Run `openspec validate --strict` after propose and before apply to catch JSON/Markdown formatting errors early.
- **Capture breaking changes in `proposal.md`.** The app is still pre-1.0 and the session JSON / cache file formats are not frozen — breaking changes are acceptable, but the proposal MUST call them out under a "Breaking changes" heading so the archive log is searchable.
- **Link the issue from both ends.** Every `proposal.md` opens with `Tracks #<N>`; every PR body closes with `Closes #<N>`. Without both, the issue ↔ change ↔ PR chain breaks and the archive log loses its anchor.

## Branches & git workflow

- **One branch per OpenSpec change.** Branch name is the change slug prefixed with the Conventional Commits type that matches the work — e.g. `feat/cache-analysis-results`, `fix/tui-enter-default-key`, `chore/openspec-archive-foo`, `docs/agent-guidelines`, `refactor/provider-seam`. Use the same type you'd use in the commit/PR subject (`feat` for new capability, `fix` for bug fixes, `chore` for tooling/maintenance, `docs` for docs-only, `refactor` for behavior-preserving restructuring, `test` for test-only). The slug after the prefix MUST still match the change folder exactly so `issue ↔ change folder ↔ branch ↔ PR` stays trivially greppable.
- **Branch from `main`, PR back into `main`.** `main` is the only long-lived branch. Squash-merging is fine for small changes; for multi-section changes, prefer a normal merge so the per-section commits survive in history (matches the bisect-friendliness rationale above).
- **Never commit directly to `main`** for code changes once a branch is open. The only exceptions are tiny doc/typo fixes and the `chore(openspec): archive ...` commit produced by `/opsx:archive` (which is conventionally landed via the same PR as the implementation).
- **PRs close issues.** Every PR body MUST contain `Closes #<N>` for the issue the change implements. Multi-issue bundles use `Closes #<N>, closes #<M>` — GitHub only auto-closes when each issue is preceded by its own keyword.
- **Hooks are real.** Husky + lint-staged run `prettier --write` and `eslint --fix` on staged `src/**/*.{ts,tsx}` files. Do not bypass with `--no-verify` — if a hook fails, fix the underlying issue.

## Testing & quality gates

Run these before opening a PR (and after each task section, when sensible):

```bash
bun run typecheck   # tsc --noEmit — must be clean
bun run lint        # eslint src — must be clean
bun run format:check
bun run test        # bun runs src/__tests__/*.test.ts
```

- Tests live in `src/__tests__/` and run via Bun's built-in test runner. Mock the AI provider and Octokit at the `AIProvider` / GraphQL-client seam, not deeper.
- The CI workflow runs the same scripts — if it's green locally, it'll be green in CI.

## Observability & telemetry

- **Langfuse tracing is opt-in.** If `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` are set, every AI call is traced with structured spans (see `openspec/specs/langfuse-span-phases/`, `langfuse-event-milestones/`, `langfuse-enriched-metadata/`). When adding a new AI call site, instrument it through the existing tracer wrapper — do not create a parallel tracing layer.
- **PostHog analytics is opt-in.** When adding or renaming a captured event, keep the event name and properties consistent with the conventions in `src/analytics.ts`. Treat `posthog-node` as fire-and-forget; never `await` it on the hot path.
- **File logging is always-on.** `src/logger.ts` writes JSONL to `$XDG_STATE_HOME/gh-star-constellation-finder/app.log` (override with `LOG_FILE`); level via `LOG_LEVEL` (default `info`). For any operational log in non-test source, use `logger.{debug,info,warn,error}` — never `console.*` (the `no-console` ESLint rule will fail the lint step otherwise, and stray `console.*` writes corrupt Ink TUI rendering).
- **Ollama has no token counts.** When extending tracing or analytics that report token usage, branch on backend and omit the field for Ollama traces rather than guessing.

## Where things live

| Area                                                | Where                                                                        |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| TUI entry / CLI flag parsing                        | `src/index.tsx`                                                              |
| AI provider abstraction (OpenAI + Ollama)           | `src/ai/`                                                                    |
| Analysis / consolidation / suggestion orchestration | `src/orchestration/`, `src/engine/`                                          |
| GitHub fetch + mutate                               | `src/github/`, `src/graphql/`                                                |
| Ink components (screens, cards, prompts)            | `src/components/`                                                            |
| Phase state machine                                 | `src/state/`                                                                 |
| Session JSON (analyze-only + interactive save)      | `src/session/`                                                               |
| CLI flag handlers (e.g. `--analyze-only`)           | `src/cli/`                                                                   |
| PostHog event names + capture helpers               | `src/analytics.ts`                                                           |
| Tests                                               | `src/__tests__/*.test.ts`                                                    |
| End-to-end pipeline doc                             | [docs/ai-engine-workflow.md](docs/ai-engine-workflow.md)                     |

<!-- gitnexus:start -->

# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gh-star-constellation-finder** (2269 symbols, 2478 relationships, 27 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Resources

| Resource                                                      | Use for                                  |
| ------------------------------------------------------------- | ---------------------------------------- |
| `gitnexus://repo/gh-star-constellation-finder/context`        | Codebase overview, check index freshness |
| `gitnexus://repo/gh-star-constellation-finder/clusters`       | All functional areas                     |
| `gitnexus://repo/gh-star-constellation-finder/processes`      | All execution flows                      |
| `gitnexus://repo/gh-star-constellation-finder/process/{name}` | Step-by-step execution trace             |

## CLI

| Task                                         | Read this skill file                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md`       |
| Blast radius / "What breaks if I change X?"  | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?"             | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md`       |
| Rename / extract / split / refactor          | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md`     |
| Tools, resources, schema reference           | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md`           |
| Index, status, clean, wiki CLI commands      | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md`             |

<!-- gitnexus:end -->
