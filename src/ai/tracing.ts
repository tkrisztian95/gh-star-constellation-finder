import { Langfuse } from "langfuse";
import type { ScopeMode, ConsolidationStrategy } from "../types.js";

// Derived span/trace types — avoids depending on named internal exports from langfuse
export type LangfuseTrace = ReturnType<Langfuse["trace"]>;
export type LangfuseSpan = ReturnType<LangfuseTrace["span"]>;
export type LangfuseParent = LangfuseTrace | LangfuseSpan;

export function createLangfuseClient(): Langfuse | null {
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY;
  const secretKey = process.env.LANGFUSE_SECRET_KEY;

  if (!publicKey || !secretKey) {
    return null;
  }

  const options: ConstructorParameters<typeof Langfuse>[0] = { publicKey, secretKey };
  if (process.env.LANGFUSE_BASE_URL) {
    options.baseUrl = process.env.LANGFUSE_BASE_URL;
  }

  return new Langfuse(options);
}

export function generateSessionId(): string {
  return crypto.randomUUID();
}

export function createRunTrace(
  langfuse: Langfuse,
  metadata: {
    repoCount: number;
    listsCount: number;
    backend: string;
    filter?: ScopeMode;
    mode?: ConsolidationStrategy;
    modelId?: string;
    filteredRepoCount?: number;
    totalRepoCount?: number;
    listNames?: string[];
    concurrency?: number;
  },
  sessionId: string,
): LangfuseTrace {
  return langfuse.trace({ name: "constellation-run", metadata, sessionId });
}

export function createPhaseSpan(
  parent: LangfuseParent | null,
  name: string,
  metadata?: object,
): LangfuseSpan | null {
  try {
    if (!parent) return null;
    return parent.span({ name, input: metadata });
  } catch {
    return null;
  }
}

export function endSpanSafe(
  span: LangfuseSpan | null | undefined,
  opts?: { output?: object; level?: string; statusMessage?: string },
): void {
  try {
    if (span) span.end(opts as Parameters<LangfuseSpan["end"]>[0]);
  } catch {
    // tracing errors must not affect execution
  }
}

export function createMilestoneEvent(
  parent: LangfuseParent | null,
  name: string,
  metadata?: object,
): void {
  try {
    if (!parent) return;
    parent.event({ name, metadata });
  } catch {
    // tracing errors must not affect execution
  }
}

export function createAgentObservation(
  trace: LangfuseTrace | null,
  name: string,
  metadata?: object,
): LangfuseSpan | null {
  try {
    if (!trace) return null;
    return trace.span({ name, input: metadata });
  } catch {
    return null;
  }
}

export async function flushTracing(langfuse: Langfuse | null): Promise<void> {
  if (langfuse) {
    await langfuse.flushAsync();
  }
}
