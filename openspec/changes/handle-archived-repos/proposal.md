## Why

Archived GitHub repositories are no longer actively maintained, yet they currently flow through the same AI analysis and list-creation pipeline as active repos — polluting regular lists with stale projects. Surfacing archive status lets the tool route them into a dedicated "Archived" list and give the AI accurate context about what it is analysing.

## What Changes

- Add `isArchived: boolean` field to the `Repo` type.
- Extend the GraphQL starred-repos query to fetch `isArchived` from GitHub.
- Map `isArchived` in `starFetcher.ts` when building `Repo` objects.
- Pass `isArchived` as explicit metadata in the AI user-message prompt so the model knows the repo is inactive.
- Override the suggestion engine so any repo with `isArchived: true` is always assigned the category `"Archived"`, bypassing normal AI categorisation.
- Ensure the list-creation flow treats `"Archived"` as a regular (but auto-created) list name, so all archived repos land in a single consolidated GitHub List named **Archived**.

## Capabilities

### New Capabilities

- `archived-repo-routing`: Detect archived repos at fetch time and route them to a dedicated "Archived" list, bypassing the normal AI categorisation pipeline.

### Modified Capabilities

- `ai-analysis`: The user-message prompt must include an `Archived: yes/no` metadata line so the model has accurate context (even though archived repos are pre-routed and won't affect list naming).

## Impact

- `src/types.ts` — `Repo` interface gains `isArchived`.
- `src/graphql/queries.ts` — `STARRED_REPOSITORIES_QUERY` gains `isArchived` field.
- `src/github/starFetcher.ts` — `GraphQLRepo` interface and `mapRepo` gain `isArchived`.
- `src/ai/prompts.ts` — `buildUserMessage` appends `Archived: yes` / `Archived: no` line.
- `src/ai/types.ts` — `RepoInput` gains `isArchived`.
- `src/engine/suggestionEngine.ts` — pre-route archived repos to the `"Archived"` category before AI categorisation is applied.
- `src/index.tsx` — pass `isArchived` through to the engine / AI pipeline.
- No external API changes; no breaking changes to existing GitHub Lists.
