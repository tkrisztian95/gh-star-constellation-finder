## Why

The current AI prompts for repository analysis produce inconsistent, generic category names and vague killer features — directly causing duplicate GitHub Lists and poor user-facing quality. The prompts don't tell the model that categories become real GitHub List names, omit casing rules, provide no examples, and give no guidance for repos with missing READMEs.

## What Changes

- Rewrite the shared `SYSTEM_PROMPT` in both analyzers to include purpose context, category format rules, and killer-feature guidance
- Restructure `buildUserMessage` to signal README absence clearly and separate signal from noise
- Extract prompts into a shared `src/ai/prompts.ts` module so both OpenAI and Ollama analyzers stay in sync
- Add a `staleness` flag to `AnalysisResult` to surface repos with no README and no description for health-audit purposes

## Capabilities

### New Capabilities
- `repo-analysis-prompt`: The structured prompt contract that governs how AI models analyse a GitHub repository — including system role, category naming rules, killer-feature framing, and fallback behaviour for data-sparse repos

### Modified Capabilities
<!-- none — no existing spec files to delta against -->

## Impact

- `src/ai/openaiAnalyzer.ts` — updated prompt strings
- `src/ai/ollamaAnalyzer.ts` — updated prompt strings (kept in sync via shared module)
- `src/ai/prompts.ts` — new shared module (single source of truth for prompt text)
- `src/ai/types.ts` — `AnalysisResult` gains optional `dataQuality` field
- No changes to GitHub API layer, TUI components, or suggestion engine logic
