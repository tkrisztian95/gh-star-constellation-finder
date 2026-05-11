import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { homedir } from "node:os";

const APP_NAME = "gh-star-constellation-finder";

type Level = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

interface LoggerState {
  stream: WriteStream | null;
  threshold: number;
  headless: boolean;
}

let state: LoggerState | null = null;

function defaultLogPath(): string {
  const stateHome = process.env.XDG_STATE_HOME;
  const base = stateHome && stateHome.length > 0 ? stateHome : join(homedir(), ".local", "state");
  return join(base, APP_NAME, "app.log");
}

function parseLevel(raw: string | undefined): { level: Level; invalid: boolean } {
  if (!raw) return { level: "info", invalid: false };
  const lower = raw.toLowerCase();
  if (lower === "debug" || lower === "info" || lower === "warn" || lower === "error") {
    return { level: lower, invalid: false };
  }
  return { level: "info", invalid: true };
}

function resolveLogFile(raw: string | undefined): { path: string; relativeRejected: boolean } {
  if (!raw) return { path: defaultLogPath(), relativeRejected: false };
  if (!isAbsolute(raw)) return { path: defaultLogPath(), relativeRejected: true };
  return { path: raw, relativeRejected: false };
}

function openStream(path: string): WriteStream | null {
  try {
    mkdirSync(dirname(path), { recursive: true });
    return createWriteStream(path, { flags: "a" });
  } catch {
    return null;
  }
}

function writeJsonl(level: Level, msg: string, fields: Record<string, unknown> | undefined): void {
  if (!state || !state.stream) return;
  if (LEVEL_PRIORITY[level] < state.threshold) return;
  let line: string;
  try {
    const envelope: Record<string, unknown> = { ...(fields ?? {}) };
    envelope.ts = new Date().toISOString();
    envelope.level = level;
    envelope.msg = msg;
    line = JSON.stringify(envelope) + "\n";
  } catch {
    return;
  }
  try {
    state.stream.write(line);
  } catch {
    // swallow — safe-to-fail
  }
  if (state.headless && (level === "warn" || level === "error")) {
    mirrorToStderr(level, msg, fields);
  }
}

function mirrorToStderr(
  level: Level,
  msg: string,
  fields: Record<string, unknown> | undefined,
): void {
  try {
    const parts: string[] = [level.toUpperCase(), msg];
    if (fields) {
      for (const [k, v] of Object.entries(fields)) {
        if (k === "ts" || k === "level" || k === "msg") continue;
        parts.push(`${k}=${formatField(v)}`);
      }
    }
    process.stderr.write(parts.join(" ") + "\n");
  } catch {
    // swallow
  }
}

function formatField(v: unknown): string {
  if (v === null) return "null";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function initLogger(opts: { headless: boolean }): void {
  if (state) return;
  const { level, invalid: invalidLevel } = parseLevel(process.env.LOG_LEVEL);
  const { path, relativeRejected } = resolveLogFile(process.env.LOG_FILE);
  const stream = openStream(path);
  state = {
    stream,
    threshold: LEVEL_PRIORITY[level],
    headless: opts.headless,
  };
  try {
    process.on("exit", () => {
      try {
        stream?.end();
      } catch {
        // swallow
      }
    });
  } catch {
    // swallow
  }
  if (invalidLevel) {
    writeJsonl("warn", "invalid LOG_LEVEL value; falling back to info", {
      received: process.env.LOG_LEVEL,
    });
  }
  if (relativeRejected) {
    writeJsonl("warn", "LOG_FILE must be an absolute path; falling back to default", {
      received: process.env.LOG_FILE,
    });
  }
}

export const logger = {
  debug(msg: string, fields?: Record<string, unknown>): void {
    writeJsonl("debug", msg, fields);
  },
  info(msg: string, fields?: Record<string, unknown>): void {
    writeJsonl("info", msg, fields);
  },
  warn(msg: string, fields?: Record<string, unknown>): void {
    writeJsonl("warn", msg, fields);
  },
  error(msg: string, fields?: Record<string, unknown>): void {
    writeJsonl("error", msg, fields);
  },
};

export async function __resetLoggerForTests(): Promise<void> {
  const stream = state?.stream ?? null;
  state = null;
  if (!stream) return;
  await new Promise<void>((resolve) => {
    try {
      stream.end(() => resolve());
    } catch {
      resolve();
    }
  });
}
