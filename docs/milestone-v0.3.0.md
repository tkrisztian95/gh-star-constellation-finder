> **Shipped in v0.2.0** (2026-06-05). This constellation milestone is delivered; see CHANGELOG `[0.2.0]`.

# Milestone: v0.3.0 — Constellation: an entity graph over your stars

> **Status:** target. Nothing in this milestone has shipped yet. It depends on [v0.2.0](./milestone-v0.2.0.md) landing first. See [CHANGELOG.md](../CHANGELOG.md) for what's actually released.

## Headline

Deliver the **constellation** the project is named for: extract technical entities from every starred repo, then connect stars that share entities into a navigable graph. v0.2.0 made the corpus _queryable_ (semantic search, `--ask`, MCP); v0.3.0 makes it _connected_ — "what is this near?" alongside "what answers this?".

## Why

The corpus is the asset (per the v0.2.0 thesis). Two retrieval modes compound on it:

- **Similarity** (v0.2.0): embeddings answer "what's relevant to this question."
- **Adjacency** (v0.3.0): an entity graph answers "what's related to this repo" — shared frameworks, shared domains, shared authors — which embeddings approximate but don't make explicit or traversable.

Entities are also a cheap **retrieval signal in their own right**: entity-faceted filtering ("show me everything that uses Rust + WASM") sharpens `--ask` and MCP results without an embedding round-trip. And the graph is the long-promised "constellation" — the headline artifact the name has always implied.

The structured-generation approach is already validated in a sibling prototype (`hp-ner-structured`) and aligns with the existing direction in issue [#33](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/33) (Ollama JSON-schema `format` mode). It rides the existing `AIProvider` seam — no new abstraction.

## Scope

### In scope for v0.3.0

1. **Per-repo entity extraction.** Add `entities: { name: string; label: EntityLabel }[]` to `AnalysisResult`. Tech-oriented label set: `LANGUAGE`, `FRAMEWORK`, `TOOL`, `CONCEPT`, `ORG`, `PERSON`, `DOMAIN`. Extracted via constrained decoding (Ollama JSON-schema `format`, OpenAI structured outputs) through the existing `AIProvider`. Cache schema migrates once (drop + recreate, same pattern v1→v2 used for `description`); existing entries re-analysed once. _~2 days._
2. **Co-occurrence graph builder.** Stars are nodes; an edge connects two stars for each entity they share, weighted by shared-entity count. Entity-IDF down-weighting + a stopword-entity list + min-count / min-edge-weight thresholds prevent a junk hub (e.g. "JavaScript" linking everything). Export **GEXF** (Gephi) + a plain JSON graph. _~3 days._
3. **`--constellation` headless mode.** A flag that builds the graph from the cache and emits GEXF/JSON to stdout or a file — no TUI. Mirrors `--analyze-only` / `--ask` in shape (JSON in / JSON out / headless parity). _~2 days._
4. **MCP `related_stars(repo, k)` tool.** Returns the k nearest stars by graph adjacency. Slots beside v0.2.0's `search_stars` / `ask_stars` on the same MCP server. This is the discoverability payload — "what's related to X in my stars" is a natural agent query. _~2 days._

### Explicitly NOT in scope for v0.3.0

- **Interactive graph visualization** (static force-graph HTML, in-TUI graph view). A new surface on top of the GEXF/JSON output — defer to v0.4.0. GEXF-in-Gephi covers the visual need for now.
- **Multi-angle analysis** (FAQ / security / features facets, issue [#11](https://github.com/tkrisztian95/gh-star-constellation-finder/issues/11)). Still deferred; entity extraction is a single additional field, not a 4× facet multiplier.
- **Entity-based re-categorization.** The categorizer pipeline stays frozen; entities feed retrieval and the graph, not the GitHub-Lists suggestion flow.
- **Cross-account / shared constellations.** Local-first, single-account only.

## Order of work

The numbered items above are the intended commit order. Each becomes its own OpenSpec change under `openspec/changes/<slug>/`.

| #   | Slug                          | Effort | Depends on            |
| --- | ----------------------------- | ------ | --------------------- |
| 1   | `star-entity-extraction`      | ~2 day | v0.2.0 cache (#42/#44) |
| 2   | `constellation-graph-build`   | ~3 day | #1                    |
| 3   | `constellation-headless-mode` | ~2 day | #2                    |
| 4   | `constellation-mcp-tool`      | ~2 day | #2, v0.2.0 MCP server |

Effort is calendar days at evening-and-weekend pace, padded for the OpenSpec proposal cycle each change carries. Realistic elapsed timeline: **4–6 weeks**, and only after v0.2.0 ships.

## Success criteria

v0.3.0 ships when **all** of these are true:

- [ ] Every cache entry carries an `entities` array; old entries re-analysed once during the schema migration.
- [ ] `bun run dev -- --constellation` emits valid GEXF that opens in Gephi, plus an equivalent JSON graph.
- [ ] The graph is _interesting_, not noise: the largest connected component covers the majority of stars, and no single entity node dominates as a junk hub (verified against a real account).
- [ ] An MCP `related_stars` call returns sensible neighbours end-to-end against a real account. _One published demo (graph screenshot + an MCP query) is the artefact._
- [ ] No regression in the categorizer flow or in v0.2.0 retrieval — `bun run test` + manual smoke both pass.

## Risks

- **Entity quality.** Local models invent libraries / mislabel. Mitigation: constrained decoding (schema-bound output), `temperature=0`, and a small entity-extraction eval reusing the v0.2.0 eval-harness shape.
- **Graph noise.** Ubiquitous entities ("JavaScript", "API") collapse the graph into one hub. Mitigation: entity-IDF weighting, a stopword-entity list, and tunable min-count / min-edge-weight thresholds — shipped as flags, not hardcoded.
- **Added indexing cost.** One extra structured field per repo. Free on the local Ollama path; document the OpenAI delta (keep total under the v0.2.0 ~$2 / 300-stars budget).
- **TS graph tooling.** No networkx in Bun. Validate `graphology` + a GEXF writer early; fall back to hand-rolled GEXF emission if the writer is immature.
- **Scope drift into viz.** "Chat with your stars" became "see your stars" will tempt an in-app graph view. Hold the line — viz is v0.4.0.

## Deferred to later milestones

| Item                                          | Likely milestone |
| --------------------------------------------- | ---------------- |
| Interactive graph visualization (HTML / TUI)  | v0.4.0           |
| Multi-angle analysis facets                   | v0.4.0+ (#11)    |
| Entity-aware re-ranking of `--ask` results    | v0.4.0           |

## Tracking

- This document is the source of truth for the v0.3.0 scope. Any scope change lands here first, then propagates to OpenSpec changes and issue milestones.
- A GitHub milestone named `v0.3.0` holds the epic + the four change issues spawned from the table above.
- The [Unreleased section of CHANGELOG.md](../CHANGELOG.md#unreleased) tracks shipped slices as they land.
