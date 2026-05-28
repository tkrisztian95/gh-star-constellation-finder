## 1. Type, schema & parser

- [x] 1.1 Add required `description: string` to the `AnalysisResult` interface in `src/ai/types.ts`.
- [x] 1.2 Extend `responseSchema` with `description: z.string().default("")` so valid objects without the key still parse.
- [x] 1.3 Update `parseAnalysisResponse`: read `description` in the lenient fallback branch (string-or-`""`) and include it in every returned object, including the final `{ category, killerFeature }` failure path.

## 2. Prompts

- [x] 2.1 Update `BASE_SYSTEM_PROMPT` in `src/ai/prompts.ts` to document `description` as a third JSON field: 1–2 factual technical sentences, optimised for semantic search, no marketing language.
- [x] 2.2 Add a positive example and a negative (marketing-flavoured) example for `description` in the prompt body.
- [x] 2.3 Update the JSON-keys instruction (the `Respond in JSON with keys ...` line in `buildAnalyzeRepoPrompt`) to list `category`, `killerFeature`, and `description`.

## 3. Analysis cache

- [x] 3.1 Add `description TEXT NOT NULL` to `CREATE_TABLE_SQL` in `src/cache/analysisCache.ts`.
- [x] 3.2 Bump `SCHEMA_VERSION` from `1` to `2`.
- [x] 3.3 In `applySchema` (or `openWithRecovery`), read `PRAGMA user_version`; when `< SCHEMA_VERSION`, `DROP TABLE IF EXISTS entries` before recreating, then set `user_version = 2`.
- [x] 3.4 Add `description` to the `SELECT`, the row→`AnalysisResult` mapping, the `INSERT OR REPLACE` column list, and its bound params.

## 4. Surfacing in output

- [x] 4.1 Set `description` on the synthetic archived-repo `AnalysisResult` in `src/cli/modes.ts` (empty string, consistent with the fallback contract).
- [x] 4.2 Verify `--analyze-only` JSON and session JSON include `description` per suggestion's embedded analysis (flows through `AnalysisResult`; no key plumbing expected — confirm by inspection).

## 5. Tests & quality gates

- [x] 5.1 Add/extend `parseAnalysisResponse` tests: full response with `description`, response omitting `description` (→ `""`), and malformed response (→ `""`).
- [x] 5.2 Add cache tests: round-trip persists+reads `description`; opening a v1-schema db (`user_version = 1`) drops the table and starts empty; a v2 db preserves entries.
- [x] 5.3 Update any analyzer/suggestion fixtures that construct `AnalysisResult` to include `description`.
- [x] 5.4 Run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun run test` — all clean.
