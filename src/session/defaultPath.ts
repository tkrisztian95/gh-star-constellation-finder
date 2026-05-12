import path from "path";

const OUTPUT_DIR = "output";

export function sanitizeSegment(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
  return cleaned.length > 0 ? cleaned : "unknown";
}

export function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`
  );
}

export interface DefaultSavePathInput {
  modelId: string;
  now?: Date;
  baseDir?: string;
}

export function buildDefaultSavePath({ modelId, now, baseDir }: DefaultSavePathInput): string {
  const date = now ?? new Date();
  const root = baseDir ?? OUTPUT_DIR;
  const modelSegment = sanitizeSegment(modelId);
  const filename = `session-${formatTimestamp(date)}.json`;
  return path.join(root, modelSegment, filename);
}
