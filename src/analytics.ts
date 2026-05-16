import { PostHog } from "posthog-node";

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
const APP_NAME = "gh-star-constellation-finder";
const SHUTDOWN_TIMEOUT_MS = 2000;

let client: PostHog | null = null;
let _distinctId = "anonymous";

export function initAnalytics(optOut: boolean, distinctId: string): void {
  if (optOut) return;
  const apiKey = process.env.POSTHOG_API_KEY;
  if (!apiKey) return;
  _distinctId = distinctId;
  client = new PostHog(apiKey, {
    host: process.env.POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST,
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
