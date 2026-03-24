import { Langfuse } from 'langfuse';

// Derived span/trace types — avoids depending on named internal exports from langfuse
export type LangfuseTrace = ReturnType<Langfuse['trace']>;
export type LangfuseSpan = ReturnType<LangfuseTrace['span']>;

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

export function createRunTrace(
  langfuse: Langfuse,
  metadata: { repoCount: number; backend: string }
): LangfuseTrace {
  return langfuse.trace({ name: 'constellation-run', metadata });
}

export async function flushTracing(langfuse: Langfuse | null): Promise<void> {
  if (langfuse) {
    await langfuse.flushAsync();
  }
}
