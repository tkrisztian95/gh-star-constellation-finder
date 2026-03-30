## Why

The app currently has no visibility into how users interact with it — which features are used, where they drop off, or whether new changes improve the experience. Adding anonymous usage analytics via PostHog enables data-driven decisions while respecting user privacy through a transparent opt-out mechanism.

## What Changes

- Integrate PostHog SDK for anonymous event tracking
- Track key user interactions: analysis started, analysis completed, analysis interrupted (ESC), constellation saved, app launched
- Add opt-out setting persisted in local config
- Display opt-out notice on first run (or in settings) so users are aware and can decline
- No personally identifiable information (PII) collected — all events are anonymous

## Capabilities

### New Capabilities
- `analytics`: Tracks anonymous usage events via PostHog; manages opt-in/opt-out state persisted to local config

### Modified Capabilities
- (none)

## Impact

- **New dependency**: `posthog-node` (or `posthog-js` depending on runtime context)
- **Config file**: Adds `analytics.optOut` boolean field to user config
- **First-run UX**: Brief notice shown on first launch informing user of analytics collection and how to opt out
- **No network requirement**: Analytics calls are fire-and-forget; failure to send must not affect app behavior
