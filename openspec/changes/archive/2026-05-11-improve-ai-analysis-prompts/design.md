## Context

Both `openaiAnalyzer.ts` and `ollamaAnalyzer.ts` duplicate the same `SYSTEM_PROMPT` string and `buildUserMessage` function verbatim. Any prompt improvement must be applied twice, creating drift risk. The current prompts are missing three critical pieces of context the model needs to produce high-quality output:

1. **Purpose context** — categories become GitHub List names; the model optimises for a different goal (generic taxonomy) without this
2. **Format constraints** — no casing rule means `"rust cli tools"` and `"Rust CLI Tools"` both appear, but the suggestion engine lowercases for matching, so display names become inconsistent
3. **Quality calibration** — no examples and no guidance on what makes a "Killer Feature" useful

## Goals / Non-Goals

**Goals:**
- Single source-of-truth for all prompt text (`src/ai/prompts.ts`)
- System prompt communicates that categories become GitHub List names
- Category output rule: Title Case, 2–4 words, concrete not generic
- Killer feature rule: user-benefit framing, ≤12 words, action-verb start
- Graceful fallback when README is absent or < 50 chars
- Optional `dataQuality: "full" | "sparse"` on `AnalysisResult` so the UI can flag low-confidence analyses

**Non-Goals:**
- Changing the suggestion engine matching logic
- Supporting batch/multi-repo prompts in a single API call
- Changing the AI provider or model selection logic
- Internationalisation of prompt text

## Decisions

### 1. Extract shared prompts module (`src/ai/prompts.ts`)

**Decision:** Move all prompt strings and `buildUserMessage` to a new `prompts.ts` module; both analyzers import from it.

**Alternatives considered:**
- Keep prompts duplicated, apply same edit twice — rejected: guaranteed drift over time
- Pass prompts as constructor arguments — rejected: over-engineering for a fixed prompt; adds unnecessary API surface

### 2. TIDD-EC prompt structure

**Decision:** Use a Task / Instructions / Do / Don't / Examples / Context structure for the system prompt, not free-prose.

**Rationale:** The gaps identified by prompt analysis are all about missing rules and calibration examples. TIDD-EC separates Do/Don't explicitly, which prevents the model from inferring rules from vague prose. Example output pairs anchor the model's calibration with zero ambiguity.

**Alternatives considered:**
- CO-STAR (audience/tone focus) — rejected: the audience here is fixed (developer); the problem is rule clarity, not tone
- RTF (Role/Task/Format) — rejected: too minimal; doesn't accommodate Do/Don't lists or examples

### 3. Category naming rule: Title Case, 2–4 words

**Decision:** Mandate Title Case (not lowercase, not ALL CAPS) for the category output.

**Rationale:** The suggestion engine lowercases for matching, so the match works regardless of case. But the raw value is used as the display name for GitHub Lists. Title Case is the GitHub convention for list names and reads naturally to users.

### 4. `dataQuality` field on `AnalysisResult`

**Decision:** Add optional `dataQuality: "full" | "sparse"` field — set to `"sparse"` when the README is absent or very short (< 50 chars after stripping whitespace).

**Rationale:** The UI (ReviewScreen, SummaryScreen) currently has no way to flag low-confidence analyses. This field lets the TUI render a visual indicator without changing the suggestion engine logic.

**Alternatives considered:**
- Separate `confidence` number 0–1 — rejected: LLMs can't reliably self-report confidence scores; a binary signal is more honest
- Filter sparse repos before analysis — rejected: the user should still see them with a flag, not silently skip them

## Risks / Trade-offs

- **Prompt length increase** → Slightly higher token cost per analysis. Mitigation: the system prompt grows by ~150 tokens; negligible vs. README content which can be 1000s of tokens.
- **Ollama model quality** → Smaller local models may ignore TIDD-EC constraints. Mitigation: examples in the prompt act as few-shot anchors, which smaller models follow better than abstract rules.
- **Category format regressions** → New rules may produce different categories than before for the same repo. Mitigation: this is intentional improvement; no existing data to migrate (categories are ephemeral per-run).

## Migration Plan

No data migration needed — categories are generated fresh on each run and not persisted beyond a session.

Rollout: replace prompt strings in-place; both analyzers share the new module immediately. No feature flag needed.

## Open Questions

- Should the `dataQuality` field be surfaced in the ReviewScreen now, or deferred to a follow-up? (Recommendation: add it to `AnalysisResult` now, wire UI indicator as a stretch task)
