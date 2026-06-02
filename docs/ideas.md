# Ideas inbox

Rough capture for unfiled ideas. Once an idea is filed as a GitHub issue, remove it here — the issue tracker is the source of truth. See the `/issues-from-ideas` skill.

## v0.3.0 — Constellation (entity graph over stars)

See [docs/milestone-v0.3.0.md](./milestone-v0.3.0.md) for the full scope. Each line below becomes its own OpenSpec change once v0.2.0 ships.

- star-entity-extraction: add `entities[]` (tech NER) to AnalysisResult via constrained decoding through the AIProvider; cache schema migration.
- constellation-graph-build: co-occurrence graph (stars linked by shared entities, IDF-weighted, thresholded) → GEXF + JSON.
- constellation-headless-mode: `--constellation` flag, GEXF/JSON out, mirrors `--analyze-only` / `--ask`.
- constellation-mcp-tool: MCP `related_stars(repo, k)` via graph adjacency, beside `search_stars` / `ask_stars`.
