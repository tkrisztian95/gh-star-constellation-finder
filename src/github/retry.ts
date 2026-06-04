import { logger } from "../logger.js";

/**
 * Retry a GitHub GraphQL READ with exponential backoff + jitter on transient
 * failures (5xx gateway errors, 429, secondary rate limits). Complements the
 * `first:50` page-size fix (#65): that handles the deterministic timeout, this
 * handles transient blips.
 *
 * Reads only — do NOT wrap non-idempotent mutations (list create/delete), where
 * a retry after a lost success response would double-apply.
 */
export interface RetryOptions {
  attempts?: number; // total tries (default 3)
  baseMs?: number; // base backoff (default 1000)
  label?: string;
}

interface MaybeHttpError {
  status?: number;
  message?: string;
  response?: { headers?: Record<string, string> };
}

function isRetryable(err: unknown): boolean {
  const e = err as MaybeHttpError;
  const status = e?.status;
  if (status && (status >= 500 || status === 429)) return true;
  const msg = String(e?.message ?? "").toLowerCase();
  return (
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("bad gateway") ||
    msg.includes("gateway time-out") ||
    msg.includes("secondary rate limit") ||
    msg.includes("rate limit")
  );
}

function retryAfterMs(err: unknown): number | null {
  const h = (err as MaybeHttpError)?.response?.headers;
  const ra = h?.["retry-after"];
  if (!ra) return null;
  const secs = Number(ra);
  return Number.isFinite(secs) ? secs * 1000 : null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = opts.attempts ?? 3;
  const baseMs = opts.baseMs ?? 1000;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= attempts || !isRetryable(err)) throw err;
      const backoff = baseMs * 2 ** (attempt - 1);
      const jitter = baseMs > 0 ? Math.floor(Math.random() * baseMs) : 0;
      const delay = retryAfterMs(err) ?? backoff + jitter;
      logger.warn("github read failed; retrying", {
        label: opts.label,
        attempt,
        attempts,
        delayMs: delay,
        message: String((err as MaybeHttpError)?.message ?? err).slice(0, 120),
      });
      await sleep(delay);
    }
  }
  throw lastErr;
}
