## 1. Dependencies & Config Module

- [x] 1.1 Install `posthog-node` as a production dependency
- [x] 1.2 Create `src/config.ts` — read/write `~/.config/gh-star-constellation-finder/config.json` with fields: `analyticsOptOut`, `analyticsId`, `analyticsNoticeSeen`
- [x] 1.3 Add error handling in `src/config.ts` so any read/write failure silently returns defaults (opt-out safe)

## 2. Analytics Module

- [x] 2.1 Create `src/analytics.ts` with a `initAnalytics(optOut: boolean, distinctId: string)` function that initializes the PostHog client (or a no-op shim when opted out)
- [x] 2.2 Add `track(event: string, properties?: Record<string, unknown>)` export — adds `app: "gh-star-constellation-finder"` to every event payload so events can be filtered in a shared PostHog project
- [x] 2.3 Add `shutdown()` export that calls `posthog.shutdown()` with a 2-second timeout guard
- [x] 2.4 Set PostHog API key and host as module-level constants in `src/analytics.ts`

## 3. CLI Flag

- [x] 3.1 Add `--no-analytics` flag to `parseArgs()` in `index.tsx`, setting `result.noAnalytics = true`
- [x] 3.2 When `--no-analytics` is passed, write `analyticsOptOut: true` to config before initializing analytics

## 4. Initialization & First-Run Notice

- [x] 4.1 In `main()`, read config on startup; generate and persist `analyticsId` UUID if absent
- [x] 4.2 Initialize analytics with `initAnalytics(optOut, distinctId)` before the TUI renders
- [x] 4.3 Pass `showAnalyticsNotice` boolean (derived from `!config.analyticsNoticeSeen`) down to `ConfirmScreen`
- [x] 4.4 Update `ConfirmScreen` to display the analytics notice line when `showAnalyticsNotice` is true
- [x] 4.5 After confirm screen is shown, write `analyticsNoticeSeen: true` to config

## 5. Event Instrumentation

- [x] 5.1 Track `analysis_started` after user confirms proceed — include `{ scope, backend, repoCount }`
- [x] 5.2 Track `analysis_completed` after consolidation finishes — include `{ repoCount, suggestionCount, durationMs, backend, interrupted: false }`
- [x] 5.3 Track `analysis_completed` on ESC interrupt path — include `{ repoCount: analyzedCount, interrupted: true, choice }`
- [x] 5.4 Track `suggestions_applied` after mutations complete — include `{ accepted, failed, strategy }`

## 6. Graceful Shutdown

- [x] 6.1 Add `await analytics.shutdown()` before every `process.exit()` call in `main()` and `runAnalyzeOnly()`
- [x] 6.2 Add `process.on("beforeExit", () => analytics.shutdown())` as a safety net for unexpected exits
