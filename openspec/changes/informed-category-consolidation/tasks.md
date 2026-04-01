## 1. Prompt Layer

- [ ] 1.1 Add `buildDistributionSummaryPrompt(categorizedRepos: Map<string, RepoMeta[]>): string` to `src/ai/prompts.ts` — no README fields in input
- [ ] 1.2 Update `buildConsolidationPrompt` in `src/ai/prompts.ts` to accept optional `distributionContext?: string` and inject it as a `DISTRIBUTION CONTEXT` section before `NOW PROCESS THIS INPUT`
- [ ] 1.3 Export `RepoMeta` (or reuse an existing lightweight type) for the distribution prompt input

## 2. Consolidation Coordinator

- [ ] 2.1 Add Pass 0 in `consolidationCoordinator.ts`: build category→repos map from `analyzedRepos`, call `buildDistributionSummaryPrompt`, call provider, parse JSON response, format into a `distributionContext` string
- [ ] 2.2 Update `consolidateCategories` signature to accept optional `analyzedRepos?: AnalyzedRepo[]` after the existing `parent` parameter
- [ ] 2.3 Pass `distributionContext` (or `undefined` on Pass 0 failure) into `buildConsolidationPrompt` in Pass 2
- [ ] 2.4 Ensure Pass 0 failure is silently swallowed and consolidation continues without distribution context

## 3. Call-site Updates

- [ ] 3.1 Update `src/orchestration/review.ts` to pass `analyzedRepos` to `consolidateCategories`
- [ ] 3.2 Update interrupt-save path in `src/orchestration/analysis.ts` to pass `analyzedRepos` to `consolidateCategories`
- [ ] 3.3 Update `src/cli/modes.ts` to pass `analyzedRepos` to `consolidateCategories`

## 4. UI Sub-step Messaging

- [ ] 4.1 Add a sub-step message mechanism to the `"consolidating"` phase (e.g. a `subStep` field on the phase object or a separate state signal)
- [ ] 4.2 Update the consolidating UI component to render the sub-step message ("Analysing repo distribution…" / "Consolidating categories…")
- [ ] 4.3 Emit the appropriate sub-step signal from the coordinator before Pass 0 and before Pass 1/2

## 5. Tests

- [ ] 5.1 Add unit test for `buildDistributionSummaryPrompt`: verify all category names are present and no README content leaks in
- [ ] 5.2 Add unit test for updated `buildConsolidationPrompt`: verify `DISTRIBUTION CONTEXT` section is present when `distributionContext` is provided and absent when omitted
- [ ] 5.3 Add unit test for `consolidateCategories` with `analyzedRepos`: verify Pass 0 runs and distribution context reaches Pass 2 prompt
- [ ] 5.4 Add unit test for `consolidateCategories` Pass 0 failure: provider throws → consolidation still returns a valid result with no distribution context
- [ ] 5.5 Add unit test for `consolidateCategories` without `analyzedRepos`: verify behavior is identical to pre-change (no extra provider call)
