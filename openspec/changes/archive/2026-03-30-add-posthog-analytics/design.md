## Context

The app is a Bun/TypeScript CLI TUI using Ink (React for the terminal). It runs in a Node-compatible runtime and has no browser context. There is currently no user config file — settings come from environment variables and CLI flags. The only existing telemetry integration is Langfuse (opt-in, requires explicit env credentials).

PostHog will be added as a second telemetry layer, focused on anonymous product usage (not AI tracing). Because there is no existing config system, we need to introduce a lightweight local config file to persist the opt-out preference.

## Goals / Non-Goals

**Goals:**
- Track anonymous usage events (app launch, analysis started/completed/interrupted, suggestions applied)
- Provide a persistent opt-out mechanism stored in a local config file
- Show a one-time first-run notice so users are aware of analytics and can opt out
- Events are fire-and-forget: analytics failure must never block or crash the app

**Non-Goals:**
- No PII collected (no GitHub username, repo names, or any user-identifiable data in events)
- No user-facing analytics dashboard or reporting
- No opt-in flow — analytics is on by default, opt-out is the mechanism
- No browser/web integration (posthog-node only)
- No retroactive backfill of historical data

## Decisions

### D1: Use `posthog-node` (not `posthog-js`)
The app runs in Bun/Node, not a browser. `posthog-node` is the correct SDK. It supports async event flushing and a `shutdown()` call to flush the queue before process exit.

**Alternatives considered:** `posthog-js` — browser SDK, not appropriate here.

### D2: Config file at `~/.config/gh-star-constellation-finder/config.json`
The XDG Base Directory spec (`~/.config/`) is the standard for user config on Linux/macOS. This is a minimal JSON file `{ "analyticsOptOut": true }`. We create the directory on first write if it doesn't exist.

**Alternatives considered:**
- Environment variable `GH_STAR_NO_ANALYTICS=1` — works but is ephemeral and less discoverable for non-technical users.
- `~/.gh-star-constellation-finder` — non-standard dotfile in home dir.

### D3: Opt-out via `--no-analytics` CLI flag and config key
Two mechanisms: a `--no-analytics` flag (takes effect for current run and writes to config), and the persisted `analyticsOptOut` key. The flag is easier to discover, the config persists across runs.

### D4: First-run notice in the confirm screen
The existing `ConfirmScreen` (shown before analysis starts) is the right place to add a small one-time notice: "Anonymous usage data is collected to improve this tool. Run with --no-analytics to opt out." The notice is shown only once (gated on config `analyticsNoticeDismissed: true` not being set).

**Alternatives considered:** A dedicated screen — adds friction and a new phase just for a notice.

### D5: Centralized `analytics.ts` module under `src/`
A single `src/analytics.ts` module wraps the PostHog client, reads config, and exposes typed `track(event, props)` and `shutdown()` functions. This keeps PostHog details out of `index.tsx`.

### D6: Anonymous distinct_id derived from a random UUID stored in config
PostHog requires a `distinct_id`. We generate a random UUID once and persist it in config alongside the opt-out flag. This enables session-level cohort analysis without tying the ID to any real identity.

## Risks / Trade-offs

- **Network call on every run** → Mitigation: PostHog batches and sends asynchronously; we call `shutdown()` before process exit to flush. All calls are fire-and-forget with no await in the hot path.
- **Config file permission errors** → Mitigation: wrap all config read/write in try/catch; failure defaults to analytics disabled (fail-safe).
- **Users may not notice the first-run notice** → Acceptable: the notice is informational, not a consent gate. GDPR/CCPA compliance for anonymous data without PII is generally not required.
- **PostHog API key in source** → Acceptable for open-source CLI tools; the key is write-only and can be rate-limited by domain in PostHog settings.

## Migration Plan

1. Install `posthog-node` dependency
2. Add `src/analytics.ts` module
3. Add `src/config.ts` module for reading/writing `~/.config/gh-star-constellation-finder/config.json`
4. Wire analytics calls into `index.tsx` at key phase transitions
5. Add `--no-analytics` CLI flag
6. Add first-run notice to `ConfirmScreen` or as a pre-confirm text block
7. Call `analytics.shutdown()` before all `process.exit()` paths

No database migrations, no breaking API changes, no deploy steps needed.
