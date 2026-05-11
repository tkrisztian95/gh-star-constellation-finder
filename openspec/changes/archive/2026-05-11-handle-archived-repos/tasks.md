## 1. Data Layer — fetch and propagate isArchived

- [x] 1.1 Add `isArchived: boolean` to the `Repo` interface in `src/types.ts`
- [x] 1.2 Add `isArchived` field to the `STARRED_REPOSITORIES_QUERY` GraphQL query in `src/graphql/queries.ts`
- [x] 1.3 Add `isArchived: boolean` to the `GraphQLRepo` interface in `src/github/starFetcher.ts`
- [x] 1.4 Map `node.isArchived` in the `mapRepo` function in `src/github/starFetcher.ts`

## 2. AI Prompt Layer — include archive metadata

- [x] 2.1 Add `isArchived: boolean` to the `RepoInput` interface in `src/ai/types.ts`
- [x] 2.2 Append `Archived: yes` / `Archived: no` line to `buildUserMessage` output in `src/ai/prompts.ts`

## 3. Suggestion Engine — pre-route archived repos

- [x] 3.1 In `src/engine/suggestionEngine.ts`, before calling the analyser, check `repo.isArchived`; if `true`, use a synthetic `AnalysisResult` `{ category: "Archived", killerFeature: "(archived repository)", dataQuality: "sparse" }` and skip the analyser call
- [x] 3.2 Verify that the existing create-list / move-to-list routing in `generateSuggestions` correctly groups all archived repos under a single "Archived" list (no new logic needed — confirm by reading the flow)

## 4. Wiring — pass isArchived through the call sites

- [x] 4.1 In `src/index.tsx` (or wherever `RepoInput` is constructed from `Repo`), pass `isArchived` from `Repo` to `RepoInput`

## 5. Tests

- [x] 5.1 Update existing `suggestionEngine` tests in `src/__tests__/suggestionEngine.test.ts` to include `isArchived` on `Repo` fixtures (set to `false` to preserve existing behaviour)
- [x] 5.2 Add test: archived repo produces `create-list` suggestion with `targetListName === "Archived"` and does not call the analyser
- [x] 5.3 Add test: multiple archived repos produce one `create-list` + N-1 `move-to-list` suggestions all targeting "Archived"
- [x] 5.4 Add test: `buildUserMessage` includes `Archived: yes` when `isArchived` is true and `Archived: no` when false
