## 1. Shared Prompt Module

- [x] 1.1 Create `src/ai/prompts.ts` exporting `SYSTEM_PROMPT` string and `buildUserMessage` function
- [x] 1.2 Write `SYSTEM_PROMPT` using TIDD-EC structure: task context (categories become GitHub List names), category Do/Don't rules with examples, killer-feature Do/Don't rules with examples, data-quality instruction
- [x] 1.3 Update `buildUserMessage` to explicitly label README as absent when empty, and include a character count hint for sparse READMEs

## 2. Type Updates

- [x] 2.1 Add `dataQuality?: "full" | "sparse"` to `AnalysisResult` in `src/ai/types.ts`
- [x] 2.2 Update Zod `responseSchema` in both analyzers to include the optional `dataQuality` field

## 3. Analyzer Refactor

- [x] 3.1 Remove local `SYSTEM_PROMPT` and `buildUserMessage` from `src/ai/openaiAnalyzer.ts` and import from `src/ai/prompts.ts`
- [x] 3.2 Remove local `SYSTEM_PROMPT` and `buildUserMessage` from `src/ai/ollamaAnalyzer.ts` and import from `src/ai/prompts.ts`

## 4. Verification

- [x] 4.1 Run existing tests (`bun test`) and confirm they still pass
- [x] 4.2 Manually verify prompt output with a sample repo (check category is Title Case, killer feature starts with action verb, `dataQuality` is returned)
