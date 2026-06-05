> **Renumbered → v0.3.0.** The constellation shipped first (released as v0.2.0); this retrieval pivot is now the v0.3.0 milestone. Heading kept for link stability.

# Milestone: v0.2.0 — Pivot from organiser to knowledge harness

> **Status:** target. Nothing in this milestone has shipped yet. See [CHANGELOG.md](../CHANGELOG.md) for what's actually released.

## Headline

Reframe the project from "a TUI that organises starred repos into GitHub Lists" to **"a local-first knowledge base built from your GitHub stars"**. The existing categorizer becomes one consumer of the corpus, not the whole project. The headline surface is a retrieval layer (chat, headless query, MCP server) over the analysis cache that v0.1.0 already builds.

## Why

The starred-repo organiser is a closed problem with a small audience: people categorise once, then don't. The starred-repo knowledge harness is an open problem people return to weekly. The asset that compounds is the per-repo analysis + SQLite cache — not the list-categorisation output. v0.1.0 already invested in the right substrate; the categorizer is almost a byproduct of it.

The pivot also unlocks discoverability. "MCP server for your GitHub stars" pulls a meaningfully larger crowd than "TUI for GitHub Lists" — MCP is on fire right now and long-tail personal-data MCP servers are exactly what the ecosystem lacks. And it weakens the GitHub-Lists vendor-lock risk: even if GitHub kills Lists tomorrow, the harness is still useful.

## Scope

### In scope for v0.2.0

1. **README + identity reframe.** Move "organise starred repos" off the headline; lead with "knowledge base for your starred repos." The categorizer is documented as one consumer of the corpus. This is docs-only and lands before any new code. _~half a day._
2. **Retrieval-friendly analyser output.** Add a `description` field to the per-repo `AnalysisResult` — 1–2 technical sentences optimised for semantic search (no marketing fluff). Cache schema migrates once; existing entries get re-analysed once. Today's `category` + `killerFeature` stay (they're still useful for labels), but the description is the field embeddings will see.
3. **Eval harness (`bun run evals`).** A 50–100 query golden set under [openspec/specs/eval-harness/spec.md](../openspec/specs/eval-harness/) (TBD) with ground-truth repo URLs per query. Reports precision@k, recall@k, and a "no-answer" rate. Required _before_ the retrieval surface — without this, prompt iteration is blind and there's no objective regression signal.
4. **Embeddings + retrieval layer in the SQLite cache.** New `embeddings` table keyed alongside the existing `entries` row. Pluggable embedder (OpenAI `text-embedding-3-small` by default, Ollama `nomic-embed-text` for the local path) via the existing `AIProvider` seam — no new abstractions, extend the seam if needed.
5. **Headless `--ask <question>`** (issue [#21](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/21) phase A). Single-shot semantic search → answer with cited repo URLs, emitted as JSON. Reuses everything from #2–#4. Mirrors the existing `--analyze-only` surface in shape — JSON in / JSON out / no TUI.
6. **MCP server** (issue [#21](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/21) phase B + issue [#7](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/7)). Stdio transport, exposes `search_stars(query, k)` and `ask_stars(question)` tools. Same retrieval layer as `--ask`. This is the discoverability headline — Claude / Cursor / Cline users plug it in and get value with zero TUI exposure. **This is where the v0.2.0 audience lives.**

### Explicitly NOT in scope for v0.2.0

- **TUI chat surface** (issue #21 phase C). Nice-to-have, but the MCP surface is where users actually are. Phase C is a v0.3.0 candidate.
- **Multi-angle analysis** (issue [#11](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/11)). FAQ / security / features / issues facets multiply per-repo analysis cost by 4×. Defer until retrieval shape is proven; multi-angle without retrieval is just expensive prompt budget.
- **Parallel headless model compare as a top-level mode** (issue [#10](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/10)). Reframe: this is an _evals sub-feature_, not a standalone mode. The eval harness makes this trivial; without it, it's a half-built benchmark.
- **Categorizer changes.** The existing analysis → consolidation → suggestion pipeline is frozen for v0.2.0. Any change to it is out of scope unless it directly enables retrieval (e.g. the `description` field in #2).
- **CLI flag deprecations / renames.** The current flag surface stays; new flags are additive.

## Order of work

The numbered items in "In scope" above are the intended commit order. Each becomes its own OpenSpec change under `openspec/changes/<slug>/`.

| #   | Slug                     | Tracking issue                                                                                                                                                      | Effort   | Depends on   |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------ |
| 1   | `harness-reframe-readme` | [#41](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/41)                                                                                       | ~0.5 day | —            |
| 2   | `analyzer-description`   | [#42](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/42)                                                                                       | ~1 day   | #41          |
| 3   | `eval-harness`           | [#43](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/43)                                                                                       | ~2 days  | #42          |
| 4   | `analysis-embeddings`    | [#44](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/44)                                                                                       | ~3 days  | #42, #43     |
| 5   | `ask-headless-mode`      | [#21](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/21) phase A                                                                               | ~3 days  | #44          |
| 6   | `mcp-server`             | [#21](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/21) phase B + [#7](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/7) | ~4 days  | #21A (= #21) |

Effort is calendar days for a single person at evening-and-weekend pace, padded for the OpenSpec proposal + design cycle each change carries. The realistic timeline is **8–12 weeks elapsed**, not the ~13 dev-days summed above.

## Success criteria

v0.2.0 ships when **all** of these are true:

- [ ] README headline reflects the harness identity; "organise your lists" is documented as one feature, not the project.
- [ ] `description` field is on every entry in the analysis cache; old entries re-analysed once during the schema migration.
- [ ] `bun run evals` produces a numeric scorecard against a committed golden queryset; the report is stable enough to detect regressions.
- [ ] `bun run dev -- --ask "<question>"` returns JSON with cited repo URLs; precision@5 ≥ 0.6 on the golden queryset.
- [ ] An MCP server (stdio transport) installs into Claude Desktop / Cursor / Cline and answers a real question against a real account end-to-end. _One published demo recording is the artefact._
- [ ] No regression in the existing categorizer flow — `bun run test` + manual smoke against a small account both still pass.

The first three of these are quality gates that must precede the user-facing surfaces; the last three are the user-facing surfaces themselves.

## Risks

- **Retrieval quality must be high or users churn after 2–3 bad answers.** This is _the_ pivot risk. The eval harness is the mitigation; ship it before the surface, not after.
- **Cost per indexing run.** Today's analyse-only is ~$0.20–$1 for 300 stars; embeddings add a per-repo call. Stay under ~$2 for 300 stars with the OpenAI defaults; if not, default to local nomic-embed-text and document the cost explicitly.
- **Scope creep.** Once the surface is "chat with your stars," every comment/issue/PR/release will want to land in the corpus. Strict "no" to anything not in the scope list until v0.2.0 ships. New ideas land in `docs/ideas.md` and are deferred to a v0.3.0 milestone doc.
- **MCP protocol churn.** The protocol revs and transports change (stdio → streamable HTTP is already on the roadmap). Plan for ongoing maintenance; pick the MCP SDK that's most likely to absorb spec changes for you.
- **Solo-maintainer collapse.** If you can't commit to ~3 months of focused work, don't start. A half-built retrieval surface is worse than no retrieval surface — the categorizer at least closes its loop on every run.

## Deferred to later milestones

| Item                                                                  | Likely milestone  | Issue                                                                                 |
| --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------- |
| Multi-angle analysis (FAQ / security / features / issues)             | v0.3.0            | [#11](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/11)         |
| Interactive TUI chat REPL                                             | v0.3.0            | [#21](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/21) phase C |
| Parallel headless model compare top-level mode                        | folded into evals | [#10](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/10)         |
| Format contract freeze (cache schema, session JSON, MCP tool schemas) | v1.0.0            | —                                                                                     |
| Self-hosted MCP server with streamable HTTP transport                 | v0.4.0 or later   | —                                                                                     |

## Tracking

- This document is the source of truth for the v0.2.0 scope. Any change to scope lands here first, then propagates to OpenSpec changes and issue milestones.
- A matching GitHub milestone named `v0.2.0` will hold the relevant issues (#21, #7, plus new ones spawned from the OpenSpec proposals in the table above).
- The [Unreleased section of CHANGELOG.md](../CHANGELOG.md#unreleased) tracks shipped slices of this milestone as they land.
