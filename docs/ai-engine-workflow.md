# AI Engine Workflow

This is the engine-level companion to the main [README](../Readme.md). It walks through every phase that touches the AI provider, names the modules and functions involved, and points at the exact source locations so you can jump in.

Conventions used below:

- File references use `path:line` so they're greppable.
- "AI provider" refers to either the OpenAI or Ollama implementation, both behind the `AIProvider` interface in [src/ai/types.ts](../src/ai/types.ts).
- "Phase" labels match the JSONL log lines and Langfuse span names — search them up in either source.

---

## At a glance

The engine has five phases. Phases 2–4 contain AI calls; the rest are deterministic plumbing.

| #   | Phase                             | Module                                                                                                        | AI calls?              |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Fetch — stars, lists, READMEs     | [src/github/starFetcher.ts](../src/github/starFetcher.ts), [readmeFetcher.ts](../src/github/readmeFetcher.ts) | No                     |
| 2   | Per-repo analysis (cached)        | [src/orchestration/analysis.ts](../src/orchestration/analysis.ts), [src/ai/prompts.ts](../src/ai/prompts.ts)  | Yes (1 per cache miss) |
| 3   | Category consolidation            | [src/orchestration/consolidationCoordinator.ts](../src/orchestration/consolidationCoordinator.ts)             | Yes (2 + chunks)       |
| 4   | Suggestion generation + rerouting | [src/engine/suggestionEngine.ts](../src/engine/suggestionEngine.ts)                                           | Yes (0 or 1)           |
| 5   | Apply mutations                   | [src/github/](../src/github/), [src/graphql/](../src/graphql/)                                                | No                     |

The provider is created once per run in `main` via `createProvider()` ([src/ai/index.ts:20](../src/ai/index.ts#L20)) using the resolved backend (`--backend` flag, `OPENAI_API_KEY`, or `OLLAMA_HOST` auto-detection).

---

## Phase 1 · Fetch & preprocess

This phase is fully deterministic but its output shapes every AI prompt downstream, so it's worth understanding.

### Stars & existing lists

`fetchStarredRepos` and `fetchUserLists` ([src/github/starFetcher.ts](../src/github/starFetcher.ts)) pull the user's stars and their existing GitHub Lists via the GraphQL API. Existing list names are passed into the system prompt later so the model prefers reusing them.

### README fetch + preprocessing

`fetchAllReadmes` ([src/github/readmeFetcher.ts:136](../src/github/readmeFetcher.ts#L136)) fetches READMEs concurrently (default 5 in parallel, configurable with `--concurrency`). Each raw README is run through `preprocessReadme` ([src/github/readmeFetcher.ts:7](../src/github/readmeFetcher.ts#L7)) before it ever reaches the model.

Preprocessing rules (in order):

1. Strip HTML comments.
2. Strip markdown badges (`[![alt](img)](link)`).
3. Strip HTML badge anchors (`<a><img></a>`).
4. Strip `<details>` blocks (translation lists, nested TOCs).
5. Strip `<picture>` blocks (light/dark mode logos, CTAs).
6. Strip centered intro divs (sponsor banners, logo headers).
7. Strip inline markdown images.
8. Strip "back to top" boilerplate links.
9. Strip TOC sections matching `# Table of Contents` / `# TOC` / `# Contents`.
10. Collapse 3+ consecutive blank lines to one.
11. Keep the first 1500 chars as the **prefix**.
12. If a `Features` / `Key Features` / `About` / `What is it?` H1–H3 section starts _after_ the prefix window, append up to 1500 chars of it.
13. Hard-cap the assembled text at 4000 chars (suffix `... [truncated]` if exceeded).

The 4000-char cap is what drives `dataQuality = 'truncated'` further down.

### Data-quality classification

After fetch, `computeDataQuality` ([src/github/readmeFetcher.ts:66](../src/github/readmeFetcher.ts#L66)) labels each repo's README:

| Label       | Meaning                                                                         |
| ----------- | ------------------------------------------------------------------------------- |
| `full`      | README ≥ the quality threshold — assume the analysis is well-grounded.          |
| `sparse`    | README < 50 chars, or the repo is archived (set deterministically, no AI call). |
| `truncated` | Preprocessing hit the 4000-char cap — the model only saw part of the README.    |

The label rides along with the analysis result and surfaces in the TUI / session JSON, so a reviewer can flag low-confidence buckets.

---

## Phase 2 · Per-repo analysis

`runAnalysis` ([src/orchestration/analysis.ts:58](../src/orchestration/analysis.ts#L58)) drives this phase. Repos are dispatched concurrently (same `--concurrency` budget as the README fetcher) through a small in-flight queue.

### Cache check first

Each repo first goes through the SQLite cache ([src/cache/analysisCache.ts](../src/cache/analysisCache.ts)):

- **Cache key:** `<repoId>:sha256(readme)` ([cacheKey at analysisCache.ts:37](../src/cache/analysisCache.ts#L37)).
- **Schema:** single `entries` table holding `category`, `killer_feature`, `data_quality`, `updated_at`, with WAL journal mode. Schema version is a `PRAGMA user_version` constant ([SCHEMA_VERSION](../src/cache/analysisCache.ts#L11)).
- **Self-healing:** if the DB file fails to open (corrupt, partial write, wrong schema) it's renamed to `<path>.broken.<timestamp>` and a fresh DB is created. See `openWithRecovery` ([analysisCache.ts:49](../src/cache/analysisCache.ts#L49)).
- **Bypass:** `--no-cache` skips the cache entirely; every repo goes to the AI.

Cache hits short-circuit Phase 2 for that repo — no prompt is built, no provider call is made.

### Archived repos skip the model

If `repo.isArchived` is true, the analyzer hardcodes:

```ts
{ category: "Archived", killerFeature: "(archived repository)", dataQuality: "sparse" }
```

— no prompt, no token cost ([analysis.ts:113](../src/orchestration/analysis.ts#L113)). This keeps the "Archived" bucket clean and protected.

### The per-repo prompt

For every non-archived cache miss the provider's `analyze(RepoInput)` is called ([AIProvider interface at types.ts:52](../src/ai/types.ts#L52)). Internally it builds two prompts:

#### `buildSystemPrompt(existingListNames)` — [prompts.ts:45](../src/ai/prompts.ts#L45)

A static base prompt (the `BASE_SYSTEM_PROMPT` constant at [prompts.ts:10](../src/ai/prompts.ts#L10)) describing:

- **Role:** "technical librarian organising a developer's GitHub starred repositories into named lists".
- **Task:** return JSON with `category` and `killerFeature`.
- **Category DO rules:** Title Case, 2–4 words, name a concrete technical domain. Examples: _Rust CLI Tools_, _Vector Databases_, _React State Management_, _GraphQL Clients_, _LLM Inference Engines_, _CSS Animation Libraries_.
- **Category DON'T rules:** no generic buckets (_JavaScript Tools_, _Python Libraries_, _Utilities_), no adjective-only labels, no language-only categories, no conflating visually adjacent domains.
- **Killer feature DO rules:** verb-led (Run, Deploy, Generate, Query, Parse, Visualise...), describe a concrete user benefit, ≤12 words.
- **Killer feature DON'T rules:** don't start with _It_, _This_, _The_, or a noun phrase; describe what the repo lets you _do_, not what it _is_.

When the user already has GitHub Lists, those names are appended in an **EXISTING LISTS** section. The instruction is strict: "MUST use that exact list name when the repo's primary technical domain clearly matches one". The prompt also enumerates common _false_ matches (UI tools ≠ Data Viz, fine-tuning libs ≠ LLM Inference Engines, etc.) to push back on shallow keyword matching.

#### `buildAnalyzeRepoPrompt(input)` — [prompts.ts:63](../src/ai/prompts.ts#L63)

The user message. It interpolates:

- `Repository: <owner>/<name>`
- `Description: <description or "(none)">`
- `Language: <language or "(unknown)">`
- `Topics: <comma-joined or "(none)">`
- `Archived: yes | no`
- The README block, with the marker `README:` for full content, `README (N chars — very short):` for ≤50 chars, or `README: (absent — no README file found)` when there isn't one.
- Trailing reminder: `Respond in JSON with keys "category" and "killerFeature".`

### Calling the model

- **OpenAI** ([src/ai/openaiProvider.ts](../src/ai/openaiProvider.ts)) — defaults to `gpt-4o-mini`, requests `response_format: { type: "json_object" }`.
- **Ollama** ([src/ai/ollamaProvider.ts](../src/ai/ollamaProvider.ts)) — defaults to `OLLAMA_HOST=http://localhost:11434`, `OLLAMA_MODEL=llama3`, requests `format: "json"`. Note: Ollama's `/api/chat` response has no `usage` field, so token counts are absent from Ollama traces.

### Parsing the response

`parseAnalysisResponse` ([src/ai/types.ts:9](../src/ai/types.ts#L9)) is intentionally lenient:

1. Extract the first `{...}` block (handles models that wrap JSON in prose despite the instruction).
2. Try `responseSchema.parse(JSON.parse(...))` — a Zod schema requiring `category` and `killerFeature` as strings.
3. Fall back to manual field extraction if the schema fails but at least `category` is salvageable.
4. As a last resort, treat the trimmed content as the category and use `fallback` (default `"analysis-failed"`).

A failure flag of `"analysis-failed"` is the canary the suggestion engine looks for downstream — these repos do not generate suggestions.

### Storing the result

Successful analyses are upserted into the cache ([analysisCache.ts:108](../src/cache/analysisCache.ts#L108)) and appended to the in-memory `analyzedRepos` array, which becomes the input to Phase 3.

---

## Phase 3 · Two-pass consolidation

`consolidateCategories` ([src/orchestration/consolidationCoordinator.ts:177](../src/orchestration/consolidationCoordinator.ts#L177)) merges the raw category names produced in Phase 2 down to a budget that fits inside GitHub's 32-list limit. The budget is constant `GITHUB_MAX_LISTS = 32` at [consolidatorDelegator.ts:4](../src/ai/consolidatorDelegator.ts#L4).

If `proposedNames.length < 2`, consolidation no-ops (`identityResult`). Otherwise the strategy gate runs first:

- `recreate` strategy zeroes out `existingLists` and resets the budget to 32 — the consolidator behaves as if starting fresh.
- All other strategies (`keep-existing`, `allow-rename`) preserve existing list context so the model knows what slots are already taken.

A deterministic **distribution context** is built before any AI call: a per-category line listing `<category>: <count> repos, top topics: <top-5 topics>`. This is injected into the Pass 2 prompt so the model has frequency and topic signal alongside the names. Code lives at [consolidationCoordinator.ts:201–230](../src/orchestration/consolidationCoordinator.ts#L201).

### Pass 1 · Language-qualifier deduplication

Single AI call via `buildLanguageQualifierPrompt(proposedNames)` ([prompts.ts:251](../src/ai/prompts.ts#L251)). Generation name: `deduplicate-language-qualifiers`.

Purpose: merge category names that differ _only_ by a language or platform qualifier — for example `Rust CLI Tools` + `Go CLI Tools` → `CLI Tools`. It deliberately does **not** do general merging; that's Pass 2's job. Pass 1 keeps the input set tight for the harder pass.

Failure handling: if the response doesn't parse, the pass identity-maps every name and Pass 2 still runs ([consolidationCoordinator.ts:240](../src/orchestration/consolidationCoordinator.ts#L240)).

### Pass 2 · Budget-aware consolidation (chunked + reducer)

Runs via `runChunkedConsolidation` ([consolidationCoordinator.ts:36](../src/orchestration/consolidationCoordinator.ts#L36)).

**Chunking.** The deduplicated names are split into chunks of `CONSOLIDATION_CHUNK_SIZE = 25` ([consolidatorDelegator.ts:9](../src/ai/consolidatorDelegator.ts#L9)) so any individual call's prompt and output stay bounded regardless of total category count. Each chunk is sent through `buildConsolidationPrompt` ([prompts.ts:94](../src/ai/prompts.ts#L94)) and gets its own generation name like `consolidate-categories-chunk-1`.

When there's only one chunk, the chunked path collapses to a single `consolidate-categories` call.

**Reducer step.** When multiple chunks ran, the merged remappings might still exceed the budget. A reducer call via `buildConsolidationReducerPrompt` ([prompts.ts:216](../src/ai/prompts.ts#L216)) then merges the chunk outputs into one final budget-aware remapping. Generation name: `consolidate-categories-reduce`. Skipped if the chunked output already fits the budget.

**Hard safety net.** `enforcebudget` ([consolidatorDelegator.ts:64](../src/ai/consolidatorDelegator.ts#L64)) runs last regardless of what the model returned. If the output still exceeds the budget, it keeps the top-N groups by repo count and force-merges everything else into the largest group. Even a completely broken model response cannot blow past 32 lists.

### Composing the final map

After both passes, the coordinator composes `original → pass1 → pass2 → final` into a single `Map<originalName, finalName>` ([consolidationCoordinator.ts:266–272](../src/orchestration/consolidationCoordinator.ts#L266)).

Total AI calls for the consolidation phase:

- ≥ 2 categories, fits in one chunk: 1 (Pass 1) + 1 (Pass 2) = **2 calls**.
- Multiple chunks: 1 (Pass 1) + N (chunks) + 1 (reducer if needed) = **2 + N**.

---

## Phase 4 · Suggestion generation

`generateSuggestions` ([src/engine/suggestionEngine.ts:35](../src/engine/suggestionEngine.ts#L35)) turns the consolidated category map into a list of concrete mutations to preview and apply.

### Suggestion variants

Defined in [src/types.ts:32–62](../src/types.ts#L32). Four discriminated-union variants:

| `type`         | Effect                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `create-list`  | Create a new GitHub List with the given name and description.                                             |
| `move-to-list` | Move a starred repo onto a list. Targets either an existing list or one pending creation in the same run. |
| `rename-list`  | Rename an existing list (only emitted when strategy is `allow-rename`).                                   |
| `delete-list`  | Delete an existing list (only emitted when strategy is `recreate`).                                       |

### Decision tree per repo

For each `(repo, analysis)` pair:

1. **Category matches an existing list?** → emit `move-to-list` targeting that list.
2. **First repo with a new category?** → emit `create-list` for the new bucket, followed by a `move-to-list` (pending) for the repo.
3. **Subsequent repos with that new category?** → emit a `move-to-list` (pending) only.
4. **Strategy is `allow-rename` and there's an unclaimed existing list that maps well?** → emit a `rename-list` instead of `create-list`, then move the repo into the renamed bucket.

The "Other" bucket is the load-bearing protected slot. One of the 32 GitHub list slots is always reserved for `Other`. The suggestion engine never emits a `rename-list` or `delete-list` whose target is the `Other` list — verified in [suggestion-engine spec](../openspec/specs/suggestion-engine/spec.md).

### Singleton rerouting

After the first pass, the engine inspects which _new_ categories would land with only a single repo. Single-repo lists are a poor use of a 32-slot budget, so an extra AI call rebalances them.

`rerouteOrphanRepos` ([consolidationCoordinator.ts:289](../src/orchestration/consolidationCoordinator.ts#L289)) is invoked via the `rerouteOrphanReposFn` callback ([suggestionEngine.ts:249](../src/engine/suggestionEngine.ts#L249)). It builds `buildReroutingPrompt(orphanCategories, availableTargets)` ([prompts.ts:308](../src/ai/prompts.ts#L308)) and asks the model to map each orphan to the best available target list — or return `null` (drop) if no fit exists.

Generation name: `reroute-orphan-repos`. The response is parsed by `parseReroutingResponse` ([consolidatorDelegator.ts:142](../src/ai/consolidatorDelegator.ts#L142)); when parsing fails, `nullRerouteMap` ([consolidatorDelegator.ts:161](../src/ai/consolidatorDelegator.ts#L161)) drops every orphan safely.

Once the reroute map is in hand, the suggestion list is patched: singleton `create-list` entries are dropped, the corresponding `move-to-list` entries are retargeted at the reroute destination (or dropped when the destination is `null`).

### Output

`SuggestionResult` ([suggestionEngine.ts:29](../src/engine/suggestionEngine.ts#L29)) is the shape consumed by both the TUI review screen and the `--analyze-only` JSON serializer.

```ts
{
  suggestions: Suggestion[],
  count: number,
  reroutedRepos: ReroutedRepo[],   // for the rename card "rerouted from" annotation
}
```

---

## Tracing & observability

Every AI call is wrapped by the optional Langfuse tracer when `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` are set. The client is created in `createLangfuseClient` ([src/ai/tracing.ts:9](../src/ai/tracing.ts#L9)) and returns `null` when env vars are absent — every span helper checks for null and no-ops cleanly.

Span hierarchy for a typical run:

- **Root trace:** `constellation-run` (created in `main`, properties: `repoCount`, `backend`, `strategy`, `sessionId`).
  - **Phase span:** `analysis-phase` ([analysis.ts:80](../src/orchestration/analysis.ts#L80))
    - **Generation:** `analyze-<owner>/<name>` per cache-miss repo.
  - **Phase span:** `consolidation-phase` ([consolidationCoordinator.ts:195](../src/orchestration/consolidationCoordinator.ts#L195))
    - **Generation:** `deduplicate-language-qualifiers` (Pass 1).
    - **Generation:** `consolidate-categories` _or_ `consolidate-categories-chunk-N` (Pass 2).
    - **Generation:** `consolidate-categories-reduce` (reducer, when multi-chunk).
  - **Generation:** `reroute-orphan-repos` (suggestion rerouting).

Token counts, model id, and prompt content land on each generation span — except for Ollama runs where the API doesn't return usage data.

The phase boundaries are also emitted as JSONL log lines via `logger.info` ([src/logger.ts](../src/logger.ts)) for offline inspection. AI _content_ is not logged here on purpose — Langfuse is the tracing system, the JSONL log covers everything else.

PostHog product analytics (Phase 2 outcome counts, suggestion counts, decision aggregates) are captured via `track()` in [src/analytics.ts](../src/analytics.ts) when `POSTHOG_API_KEY` is set. No prompt content, repo names, or tokens are sent there.

---

## AI calls summary

| Step                  | Function                                                     | Prompt builder                                 | Generation name                                                |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------- | -------------------------------------------------------------- |
| Per-repo analysis     | `provider.analyze()` ([types.ts:53](../src/ai/types.ts#L53)) | `buildSystemPrompt` + `buildAnalyzeRepoPrompt` | `analyze-<owner>/<name>`                                       |
| Consolidation Pass 1  | `provider.complete()` (via `consolidateCategories`)          | `buildLanguageQualifierPrompt`                 | `deduplicate-language-qualifiers`                              |
| Consolidation Pass 2  | `provider.complete()` (via `runChunkedConsolidation`)        | `buildConsolidationPrompt`                     | `consolidate-categories` _or_ `consolidate-categories-chunk-N` |
| Consolidation reducer | `provider.complete()` (multi-chunk path only)                | `buildConsolidationReducerPrompt`              | `consolidate-categories-reduce`                                |
| Singleton rerouting   | `provider.complete()` (via `rerouteOrphanRepos`)             | `buildReroutingPrompt`                         | `reroute-orphan-repos`                                         |

All `provider.complete()` callers accept a parent span argument so traces nest correctly. Add new AI calls through this same path — never bypass the provider abstraction.

---

## Where to make changes

Some common modification scenarios and their entry points:

| Goal                                                | Edit here                                                                                                                |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Tune the per-repo prompt (rules, examples, format)  | `BASE_SYSTEM_PROMPT` and `buildAnalyzeRepoPrompt` in [src/ai/prompts.ts](../src/ai/prompts.ts)                           |
| Add a new prompt builder for a new AI call          | `src/ai/prompts.ts` + caller in the appropriate orchestration module                                                     |
| Change the README cap or section-extraction logic   | `preprocessReadme` in [src/github/readmeFetcher.ts](../src/github/readmeFetcher.ts)                                      |
| Change consolidation chunk size or 32-list budget   | `GITHUB_MAX_LISTS` / `CONSOLIDATION_CHUNK_SIZE` in [src/ai/consolidatorDelegator.ts](../src/ai/consolidatorDelegator.ts) |
| Tighten the schema for `category` / `killerFeature` | `responseSchema` in [src/ai/types.ts](../src/ai/types.ts) — Zod                                                          |
| Add a new suggestion variant                        | `src/types.ts` (union) + `src/engine/suggestionEngine.ts` (emit) + TUI review screen                                     |
| Add a new backend (e.g. Anthropic)                  | New file under [src/ai/](../src/ai/) implementing `AIProvider`, plus the resolver in `src/ai/index.ts`                   |

Headless parity is non-negotiable: any change to the analysis / consolidation / suggestion pipeline must work identically in interactive TUI mode and `--analyze-only` mode. Both go through the same engine — keep it that way.
