import { PostHog } from "posthog-node";

const POSTHOG_API_KEY = "phc_6ijDAoR6hSveVX79OAuDy5ogb4j36vyvi0nqjTp1VQD";
const POSTHOG_HOST = "https://eu.i.posthog.com";
const APP_NAME = "gh-star-constellation-finder";
const SHUTDOWN_TIMEOUT_MS = 2000;

let client: PostHog | null = null;
let _distinctId = "anonymous";

export function initAnalytics(optOut: boolean, distinctId: string): void {
  if (optOut) return;
  _distinctId = distinctId;
  client = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    flushAt: 20,
    flushInterval: 0,
  });
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!client) return;
  try {
    client.capture({
      distinctId: _distinctId,
      event,
      properties: { source: APP_NAME, ...properties },
    });
  } catch {
    // Fire-and-forget — silently ignore errors
  }
}

export async function shutdown(): Promise<void> {
  if (!client) return;
  try {
    await Promise.race([
      client.shutdown(),
      new Promise<void>((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS)),
    ]);
  } catch {
    // Ignore shutdown errors
  }
}
