# AI Engine Workflow

```mermaid
flowchart TD
    %% ─────────────── Entry ───────────────
    START([CLI args parsed\nrepos + readmes fetched]) --> PROVIDER

    PROVIDER{{"Create AI Provider\n(OpenAI or Ollama)"}}
    PROVIDER --> ANALYSIS

    %% ─────────────── Phase 2: Analysis ───────────────
    subgraph ANALYSIS["Phase 2 · Repo Analysis  (concurrent, default ×5)"]
        direction TB
        EACH_REPO["For each filtered repo"]
        ARCHIVED{"isArchived?"}
        HARDCODE["category = 'Archived'\nkillerFeature = '(archived)'\ndataQuality = 'sparse'"]
        BUILD_INPUT["Build RepoInput\nname · owner · description\nlanguage · topics · readme\nexistingListNames"]
        AI_CALL["analyzer.analyze(RepoInput)"]
        PARSE["parseAnalysisResponse()\nvalidate with Zod schema"]
        QUALITY["computeDataQuality(readme)\n→ full | sparse | truncated"]
        STORE["Store AnalysisResult\n{ category, killerFeature, dataQuality }"]
        AI_ERR["category = 'analysis-failed'"]

        EACH_REPO --> ARCHIVED
        ARCHIVED -- yes --> HARDCODE --> STORE
        ARCHIVED -- no  --> BUILD_INPUT --> AI_CALL
        AI_CALL -- success --> PARSE --> QUALITY --> STORE
        AI_CALL -- error   --> AI_ERR --> STORE
    end

    %% ─────────────── Provider detail ───────────────
    subgraph PROVIDER_DETAIL["AI Provider · analyze()"]
        direction TB
        SYS["buildSystemPrompt(existingListNames)\n• Role: technical librarian\n• Category rules (Title Case, 2-4 words)\n• Killer Feature rules (verb-led, ≤12 words)\n• Prefer reusing existing list names"]
        USR["buildUserMessage(RepoInput)\nowner/name · description · language\ntopics · README excerpt"]
        LLM_CALL["LLM completion\nOpenAI → gpt-4o-mini  (json_object mode)\nOllama  → localhost:11434/api/chat"]
        RESP["Response JSON\n{ category: string\n  killerFeature: string }"]

        SYS --> LLM_CALL
        USR --> LLM_CALL
        LLM_CALL --> RESP
    end

    AI_CALL -.calls.-> PROVIDER_DETAIL

    %% ─────────────── Phase 3: Consolidation ───────────────
    ANALYSIS --> CONSOL

    subgraph CONSOL["Phase 3 · Two-Pass Consolidation"]
        direction TB
        EXTRACT["Extract unique new category names\n(not already in existing GitHub Lists)"]

        subgraph PASS1["Pass 1 · Language-Qualifier Deduplication"]
            P1_PROMPT["buildLanguageQualifierPrompt(names)\nmerge ONLY names differing by language qualifier\n'Rust CLI Tools' + 'Go CLI Tools' → 'CLI Tools'"]
            P1_LLM["provider.complete() → remapping JSON"]
            P1_MAP["Apply pass-1 map → deduplicatedNames"]
            P1_PROMPT --> P1_LLM --> P1_MAP
        end

        subgraph PASS2["Pass 2 · Budget-Aware Consolidation"]
            P2_BUDGET["Compute budget\n= 32 (GitHub limit) − existingListCount"]
            P2_PROMPT["buildConsolidationPrompt(\n  deduplicatedNames, existingLists,\n  maxLists=32, strategy\n)\ncompression ratio ≈ N:1"]
            P2_LLM["provider.complete() → remapping JSON"]
            P2_ENFORCE["enforcebudget()\nif AI output > budget:\n  keep top-N groups by size\n  force-merge rest into largest"]
            P2_BUDGET --> P2_PROMPT --> P2_LLM --> P2_ENFORCE
        end

        COMPOSE["Compose: pass1Map → pass2Map\nfinal remapping per original category"]

        EXTRACT --> PASS1 --> PASS2 --> COMPOSE
    end

    %% ─────────────── Phase 4: Suggestions ───────────────
    CONSOL --> SUGGEST

    subgraph SUGGEST["Phase 4 · Suggestion Generation"]
        direction TB
        APPLY_REMAP["Apply consolidated remapping\nto all analyzedRepos"]
        GEN["generateSuggestions()"]
        MATCH{"Category matches\nexisting list?"}
        MOVE["move-to-list\n(existing list)"]
        FIRST{"First repo with\nthis new category?"}
        CREATE["create-list\n+ move-to-list (pending)"]
        MOVE_PEND["move-to-list\n(pending create)"]
        RENAME_CHECK{"strategy =\nallow-rename?"}
        RENAME["rename-list\n(reuse unclaimed list)"]
        SINGLETONS{"Singleton pending\nlists exist?"}
        REROUTE["rerouteOrphanRepos()\nAI call: map orphan categories\nto available target lists"]
        PATCH["Patch suggestions:\ndrop singleton creates\nreroute moves"]

        APPLY_REMAP --> GEN --> MATCH
        MATCH -- yes --> MOVE
        MATCH -- no  --> FIRST
        FIRST -- yes --> CREATE
        FIRST -- no  --> MOVE_PEND
        CREATE --> RENAME_CHECK
        RENAME_CHECK -- yes --> RENAME
        RENAME_CHECK -- no  --> SINGLETONS
        RENAME --> SINGLETONS
        MOVE --> SINGLETONS
        MOVE_PEND --> SINGLETONS
        SINGLETONS -- yes --> REROUTE --> PATCH
        SINGLETONS -- no  --> OUT
        PATCH --> OUT["Suggestion[]\ncreate-list | move-to-list\nrename-list | delete-list"]
    end

    %% ─────────────── Reroute AI detail ───────────────
    subgraph REROUTE_DETAIL["rerouteOrphanRepos() · AI call"]
        direction LR
        RR_IN["orphan categories\navailable target lists"]
        RR_PROMPT["Prompt: map each orphan\nto best available target\nor 'DROP' if no fit"]
        RR_LLM["provider.complete()"]
        RR_OUT["rerouteMap: category → target"]
        RR_IN --> RR_PROMPT --> RR_LLM --> RR_OUT
    end

    REROUTE -.calls.-> REROUTE_DETAIL

    %% ─────────────── Langfuse Tracing ───────────────
    subgraph TRACING["Langfuse Tracing (optional)"]
        T_ROOT["Root span: constellation-run\nrepoCount · backend · strategy · sessionId"]
        T_ANALYZE["Gen: analyze-owner/name\n(per repo · tokens · model)"]
        T_DEDUP["Gen: deduplicate-language-qualifiers"]
        T_CONSOL["Gen: consolidate-categories"]
        T_REROUTE["Gen: reroute-orphan-repos"]
    end

    ANALYSIS -.traces.-> T_ANALYZE
    PASS1 -.traces.-> T_DEDUP
    PASS2 -.traces.-> T_CONSOL
    REROUTE -.traces.-> T_REROUTE
    T_ANALYZE & T_DEDUP & T_CONSOL & T_REROUTE --> T_ROOT

    %% ─────────────── Output ───────────────
    OUT --> TUI[["TUI Review\n(user accept / reject / skip)"]]
    TUI --> APPLY[["Phase 5 · Apply mutations\nvia GitHub GraphQL"]]

    %% ─────────────── Styles ───────────────
    classDef phase fill:#1e3a5f,stroke:#4a90d9,color:#e8f4fd
    classDef ai    fill:#2d1b69,stroke:#9b59b6,color:#f0e6ff
    classDef decision fill:#5a3e00,stroke:#f39c12,color:#fff8e1
    classDef trace fill:#1a3a2a,stroke:#27ae60,color:#e8f5e9

    class ANALYSIS,CONSOL,SUGGEST phase
    class PROVIDER_DETAIL,REROUTE_DETAIL ai
    class ARCHIVED,MATCH,FIRST,RENAME_CHECK,SINGLETONS decision
    class TRACING,T_ROOT,T_ANALYZE,T_DEDUP,T_CONSOL,T_REROUTE trace
```

## AI Calls Summary

| Step | Function | Prompt builder | Purpose |
|------|----------|---------------|---------|
| Repo Analysis | `analyzer.analyze()` | `buildSystemPrompt` + `buildUserMessage` | Classify each repo → category + killer feature |
| Consolidation Pass 1 | `provider.complete()` | `buildLanguageQualifierPrompt` | Merge names differing only by language qualifier |
| Consolidation Pass 2 | `provider.complete()` | `buildConsolidationPrompt` | Budget-aware merging to stay within 32-list GitHub limit |
| Singleton Rerouting | `provider.complete()` | _(inline in suggestionEngine)_ | Reroute orphan single-repo categories to existing targets |

## Data Quality Labels

| Label | Meaning |
|-------|---------|
| `full` | README ≥ quality threshold |
| `sparse` | README < 50 chars, or repo is archived |
| `truncated` | README truncated by 4 000-char fetch limit |
