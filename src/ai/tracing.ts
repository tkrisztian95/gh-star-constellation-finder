import { Langfuse } from 'langfuse';

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

export async function flushTracing(langfuse: Langfuse | null): Promise<void> {
  if (langfuse) {
    await langfuse.flushAsync();
  }
}
