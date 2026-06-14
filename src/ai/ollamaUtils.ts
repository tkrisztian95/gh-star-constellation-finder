// Utility helpers for Ollama provider

export interface GenerationEndData {
  level?: "ERROR";
  statusMessage?: string;
  output?: string;
  usage?: {
    input: number;
    output: number;
  };
  metadata?: object;
}

export function endGenerationSafe(
  generation: { end: (data: GenerationEndData) => void } | null | undefined,
  data: GenerationEndData,
) {
  try {
    if (generation) generation.end(data);
  } catch {
    // tracing errors must not affect analysis or consolidation
  }
}

export interface OllamaResponse {
  message?: { content?: string; thinking?: string };
  prompt_eval_count?: number;
  eval_count?: number;
  done_reason?: string;
}

export function parseOllamaResponseBody(body: OllamaResponse): string {
  // Handles both plain and JSON-wrapped content
  const raw = body.message?.content ?? "";
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : raw;
}

export const ANALYSIS_FAILED_RESULT = {
  category: "analysis-failed",
  killerFeature: "",
  description: "",
};

/** One NDJSON line of an Ollama streaming /api/chat response. */
interface OllamaStreamChunk {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  eval_count?: number;
  prompt_eval_count?: number;
}

export interface OllamaStreamResult {
  content: string;
  evalCount: number;
  promptEvalCount?: number;
  doneReason?: string;
  earlyExit: boolean;
}

/**
 * Returns the index just past the outermost balanced `{...}` in `s`, or -1 if no
 * top-level object has closed yet. Braces inside double-quoted strings (honoring
 * backslash escapes) are ignored so a `{` in a value never trips a false close.
 */
export function findBalancedJsonEnd(s: string): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let started = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") {
      depth++;
      started = true;
    } else if (ch === "}") {
      depth--;
      if (started && depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Consume an Ollama streaming `/api/chat` NDJSON body, accumulating
 * `message.content`. Reports progress (throttled), honours an `AbortSignal`
 * mid-stream, and early-exits once a balanced top-level JSON object is present.
 * The stream's `done` flag is the authoritative terminator.
 */
export async function consumeOllamaChatStream(
  response: Response,
  opts: { signal?: AbortSignal; onProgress?: (tokenCount: number) => void } = {},
): Promise<OllamaStreamResult> {
  const { signal, onProgress } = opts;
  const reader = response.body?.getReader();
  if (!reader) {
    // No streamable body (e.g. a mocked non-stream Response) — fall back to text.
    const text = await response.text();
    return { content: extractJson(text), evalCount: 0, earlyExit: false };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let raw = "";
  let evalCount = 0;
  let promptEvalCount: number | undefined;
  let doneReason: string | undefined;
  let earlyExit = false;
  let lastProgressAt = 0;
  const PROGRESS_EVERY = 16;

  const abort = () => {
    void reader.cancel();
    return new DOMException("Aborted", "AbortError");
  };

  while (true) {
    if (signal?.aborted) throw abort();
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line) continue;
      let chunk: OllamaStreamChunk;
      try {
        chunk = JSON.parse(line) as OllamaStreamChunk;
      } catch {
        continue; // skip a partial/garbage line; the next read may complete it
      }
      const piece = chunk.message?.content;
      if (piece) {
        raw += piece;
        evalCount++;
        if (onProgress && evalCount - lastProgressAt >= PROGRESS_EVERY) {
          lastProgressAt = evalCount;
          onProgress(evalCount);
        }
      }
      if (chunk.eval_count !== undefined) evalCount = chunk.eval_count;
      if (chunk.prompt_eval_count !== undefined) promptEvalCount = chunk.prompt_eval_count;
      if (chunk.done_reason) doneReason = chunk.done_reason;
      if (chunk.done) return finalize();
    }

    // Structural early-exit: a balanced top-level object has fully arrived.
    if (findBalancedJsonEnd(raw) !== -1) {
      earlyExit = true;
      return finalize();
    }
  }

  return finalize();

  function finalize(): OllamaStreamResult {
    return { content: extractJson(raw), evalCount, promptEvalCount, doneReason, earlyExit };
  }
}

/** Same JSON-span extraction `parseOllamaResponseBody` applies, for streamed content. */
function extractJson(raw: string): string {
  const match = raw.match(/\{[\s\S]*\}/);
  return match ? match[0] : raw;
}
