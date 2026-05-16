# Agent Guidelines

The canonical agent guide for this repository is [CLAUDE.md](CLAUDE.md). It covers the stack, project conventions, the OpenSpec workflow (`/opsx:propose` → `/opsx:apply` → `/opsx:archive`), branch and commit conventions, testing gates, and observability.

Quick orientation for any agent (Claude or otherwise):

- **Read first:** `openspec/specs/` for existing requirements, `openspec/changes/` for in-flight work.
- **Toolchain:** Bun (`bun run`, `bun install`) — never `npm` or `node`. Entry point: `src/index.tsx`.
- **Plan before code:** Non-trivial changes go through OpenSpec. One branch per change, branch name == change slug.
- **Commit cadence:** One commit per completed `tasks.md` section, scoped with the change slug (e.g. `feat(cache-analysis-results): cache module (tasks 1.x)`). Archive lands as `chore(openspec): archive <slug>`.
- **Quality gates before PR:** `bun run typecheck && bun run lint && bun run format:check && bun run test`.

See [CLAUDE.md](CLAUDE.md) for the full version — including the AI provider abstraction, the "Other" bucket invariant, the headless/TUI parity rule, and the Langfuse/PostHog opt-in contract.

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **gh-star-constellation-finder** (3224 symbols, 3379 relationships, 15 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

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

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/gh-star-constellation-finder/context` | Codebase overview, check index freshness |
| `gitnexus://repo/gh-star-constellation-finder/clusters` | All functional areas |
| `gitnexus://repo/gh-star-constellation-finder/processes` | All execution flows |
| `gitnexus://repo/gh-star-constellation-finder/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
