# Contributing

Thanks for being interested — this is a hobby project, so issues, PRs, and "this confused me" feedback are all welcome.

## Reporting bugs & requesting features

The GitHub issue tracker is the triaged queue. Before opening a new issue:

1. **Search existing issues** at <https://github.com/tkrisztian95/gh-star-constellation-finder/issues> (including closed ones) to avoid duplicates.
2. **Check the spec folder** — `openspec/specs/` is the canonical record of current behaviour; `openspec/changes/` is what's in flight. If your idea is already specced, link the spec in your issue.

When filing, please include:

- **For bugs:** what you ran (`bun run dev -- --analyze-only --limit 5 ...`), what you expected, what actually happened. The JSONL file log (default path is shown by `--help`) is gold — paste the relevant lines, especially `warn` / `error` entries.
- **For features:** the problem you're hitting and the workflow you'd want, not a pre-cooked implementation. The lifecycle (idea → issue → OpenSpec change → PR) prefers to design the solution after the problem is clear.
- **Backend you're on:** OpenAI vs Ollama matters — Ollama responses can't report token counts, and `--backend ollama` is much more sensitive to README size.

### Labels

Labels are applied at triage; you don't have to set them yourself. The taxonomy in this repo:

- One **type:** `bug` · `enhancement` · `documentation` · `type:refactor` · `type:chore`
- One **area:** `area:tui` · `area:headless` · `area:ai` · `area:github-api` · `area:cache` · `area:cli` · `area:telemetry` · `area:session`
- Plus situational: `good first issue` · `help wanted` · `question`

If you spot an issue with `good first issue` you'd like to pick up, comment to claim it before opening the PR so we don't double-up.

## Sending a pull request

The full workflow lives in [CLAUDE.md](./CLAUDE.md) under **"Workflow: idea → issue → spec → branch → PR"**. The short version:

1. **One issue per change, one change per PR.** Reference the issue from both ends: `proposal.md` opens with `Tracks #<N>`, the PR body closes with `Closes #<N>`.
2. **Non-trivial changes go through [OpenSpec](https://github.com/Fission-AI/OpenSpec) first.** Run `/opsx:propose` (or the bare `openspec` CLI) to scaffold `proposal.md`, `design.md`, `tasks.md`, and a `specs/` subtree under `openspec/changes/<change-slug>/`. Commit the proposal _before_ touching source, then work through `tasks.md` and commit per task section. Final commit on the branch is `chore(openspec): archive <slug>`.
3. **Tiny fixes** (typo / one-line behaviour fix / docs) can skip OpenSpec — just file the issue, branch, PR.
4. **Branch name** = change slug prefixed with the Conventional Commits type: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`, `docs/<slug>`, `refactor/<slug>`, `test/<slug>`.
5. **Commit messages** follow [Conventional Commits](https://www.conventionalcommits.org/). Look at `git log` for the established style.

## Local development

```bash
bun install
cp .env.example .env   # fill in GITHUB_TOKEN + one AI backend
bun run dev
```

Quality gates run in CI; please make sure they pass locally before opening the PR:

```bash
bun run typecheck    # tsc --noEmit
bun run lint         # eslint src
bun run format:check # prettier --check src
bun run test         # bun runs src/__tests__/*.test.ts
```

Husky + lint-staged run `prettier --write` + `eslint --fix` on staged `src/**/*.{ts,tsx}` at commit time — don't bypass with `--no-verify`; fix the underlying issue. Tests live under `src/__tests__/`; mock the AI provider and Octokit at the `AIProvider` / GraphQL-client seam, not deeper.

## Project deep dives

Before suggesting an architectural change, please read these:

- [README](./Readme.md) — overall stack, CLI flags, env vars, telemetry.
- [docs/ai-engine-workflow.md](./docs/ai-engine-workflow.md) — phase-by-phase walkthrough of the AI engine with file/line pointers.
- [CLAUDE.md](./CLAUDE.md) — agent / contributor guide. Covers the full workflow, the "Other" bucket invariant, headless parity, observability conventions, and where things live.
- [openspec/specs/](./openspec/specs/) — current accepted behaviour, one folder per capability.
- [openspec/changes/](./openspec/changes/) — proposals in flight and the archived history of how the system got here.

## Code of conduct

There isn't a separate `CODE_OF_CONDUCT.md`. The expectation is straightforward: be considerate, assume the other person is acting in good faith, and prefer concrete, kind feedback. Hostile, harassing, or discriminatory behaviour will result in the conversation being closed and (if applicable) the contributor being blocked.

## License

By contributing you agree your contributions are licensed under the [MIT License](./LICENSE), the same license that covers the rest of the project.
