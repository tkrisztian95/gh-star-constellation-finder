import { mkdtempSync, readFileSync, existsSync, chmodSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { logger, initLogger, __resetLoggerForTests } from "../logger.js";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function makeTmpLogPath(): string {
  const dir = mkdtempSync(join(tmpdir(), "logger-test-"));
  return join(dir, "app.log");
}

interface CapturedStdio {
  stderr: string;
  stdout: string;
  restore: () => void;
}

function captureStdio(): CapturedStdio {
  const origErr = process.stderr.write.bind(process.stderr);
  const origOut = process.stdout.write.bind(process.stdout);
  let stderrBuf = "";
  let stdoutBuf = "";
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    stderrBuf += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stderr.write;
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    stdoutBuf += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;
  return {
    get stderr() {
      return stderrBuf;
    },
    get stdout() {
      return stdoutBuf;
    },
    restore() {
      process.stderr.write = origErr;
      process.stdout.write = origOut;
    },
  } as CapturedStdio;
}

function clearLogEnv(): void {
  delete process.env.LOG_LEVEL;
  delete process.env.LOG_FILE;
  delete process.env.XDG_STATE_HOME;
}

async function readLogLines(path: string): Promise<string[]> {
  if (!existsSync(path)) return [];
  const body = readFileSync(path, "utf8");
  return body.split("\n").filter((l) => l.length > 0);
}

async function runTests() {
  let passed = 0;
  let failed = 0;

  async function test(name: string, fn: () => Promise<void> | void) {
    clearLogEnv();
    await __resetLoggerForTests();
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (err) {
      console.error(`  ✗ ${name}: ${err instanceof Error ? err.message : String(err)}`);
      failed++;
    } finally {
      await __resetLoggerForTests();
      clearLogEnv();
    }
  }

  console.log("logger tests\n");

  // 2.2 JSONL envelope + non-overwritable keys
  await test("JSONL envelope contains ts/level/msg and merged fields", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    initLogger({ headless: false });
    logger.info("hello world", { foo: 1, bar: "baz" });
    await __resetLoggerForTests();
    const lines = await readLogLines(path);
    assert(lines.length === 1, `expected 1 line, got ${lines.length}`);
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    assert(typeof parsed.ts === "string", "ts is string");
    assert(parsed.level === "info", "level is info");
    assert(parsed.msg === "hello world", "msg matches");
    assert(parsed.foo === 1, "foo merged");
    assert(parsed.bar === "baz", "bar merged");
  });

  await test("caller cannot overwrite envelope keys", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    initLogger({ headless: false });
    logger.info("real msg", { level: "error", msg: "spoofed", ts: "fake" });
    await __resetLoggerForTests();
    const lines = await readLogLines(path);
    assert(lines.length === 1, "one line");
    const parsed = JSON.parse(lines[0]) as Record<string, unknown>;
    assert(parsed.level === "info", `level not overwritten, got ${String(parsed.level)}`);
    assert(parsed.msg === "real msg", `msg not overwritten, got ${String(parsed.msg)}`);
    assert(parsed.ts !== "fake", "ts not overwritten");
  });

  // 2.3 Level filtering
  await test("LOG_LEVEL=warn drops info and debug", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    process.env.LOG_LEVEL = "warn";
    initLogger({ headless: false });
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    await __resetLoggerForTests();
    const lines = await readLogLines(path);
    assert(lines.length === 2, `expected 2 lines, got ${lines.length}`);
    const levels = lines.map((l) => (JSON.parse(l) as { level: string }).level);
    assert(levels.includes("warn") && levels.includes("error"), "warn+error present");
    assert(!levels.includes("info") && !levels.includes("debug"), "info+debug dropped");
  });

  // 2.4 Invalid LOG_LEVEL falls back to info + warn line
  await test("invalid LOG_LEVEL falls back to info and emits warn", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    process.env.LOG_LEVEL = "verbose";
    initLogger({ headless: false });
    logger.info("ok");
    await __resetLoggerForTests();
    const lines = await readLogLines(path);
    const parsed = lines.map((l) => JSON.parse(l) as { level: string; msg: string });
    const warns = parsed.filter((p) => p.level === "warn" && p.msg.includes("invalid LOG_LEVEL"));
    assert(warns.length === 1, "one invalid-LOG_LEVEL warn line");
    const infos = parsed.filter((p) => p.level === "info" && p.msg === "ok");
    assert(infos.length === 1, "info line still emitted (default threshold)");
  });

  await test("LOG_LEVEL is case-insensitive", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    process.env.LOG_LEVEL = "WARN";
    initLogger({ headless: false });
    logger.info("i");
    logger.warn("w");
    await __resetLoggerForTests();
    const lines = await readLogLines(path);
    assert(lines.length === 1, "info dropped, warn kept");
    assert((JSON.parse(lines[0]) as { level: string }).level === "warn", "warn level");
  });

  // 2.5 LOG_FILE absolute / relative
  await test("LOG_FILE absolute path is used", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    initLogger({ headless: false });
    logger.info("at custom path");
    await __resetLoggerForTests();
    assert(existsSync(path), "file created at LOG_FILE path");
    const lines = await readLogLines(path);
    assert(lines.length === 1, "one line at custom path");
  });

  await test("LOG_FILE relative path is resolved against cwd", async () => {
    const cwdDir = mkdtempSync(join(tmpdir(), "logger-cwd-"));
    const origCwd = process.cwd();
    process.chdir(cwdDir);
    try {
      process.env.LOG_FILE = "app.log";
      initLogger({ headless: false });
      logger.info("relative path works");
      await __resetLoggerForTests();
      const expected = join(cwdDir, "app.log");
      assert(existsSync(expected), `relative path resolved to cwd: ${expected}`);
      const lines = await readLogLines(expected);
      assert(lines.length === 1, "one line written");
    } finally {
      process.chdir(origCwd);
    }
  });

  await test("default path uses XDG_STATE_HOME when set", async () => {
    const xdg = mkdtempSync(join(tmpdir(), "logger-xdg-"));
    process.env.XDG_STATE_HOME = xdg;
    initLogger({ headless: false });
    logger.info("xdg test");
    await __resetLoggerForTests();
    const expected = join(xdg, "gh-star-constellation-finder", "app.log");
    assert(existsSync(expected), `xdg default path used: ${expected}`);
  });

  // 2.6 Pre-init no-op
  await test("logger calls before initLogger are no-ops", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    logger.info("before init");
    logger.error("also before");
    assert(!existsSync(path), "no file created before init");
  });

  // 2.7 Safe-to-fail with unwritable path
  await test("safe-to-fail when LOG_FILE points at unwritable path", async () => {
    const dir = mkdtempSync(join(tmpdir(), "logger-ro-"));
    try {
      chmodSync(dir, 0o000);
      process.env.LOG_FILE = join(dir, "denied", "app.log");
      initLogger({ headless: false });
      logger.error("should not throw");
      logger.warn("also should not throw");
    } finally {
      try {
        chmodSync(dir, 0o755);
        rmSync(dir, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
  });

  // 2.8 Headless stderr-mirror
  await test("headless: warn and error mirrored to stderr in compact form", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    const cap = captureStdio();
    try {
      initLogger({ headless: true });
      logger.warn("rate limit low", { remaining: 12 });
      logger.error("auth failed", { reason: "missing_token" });
      await __resetLoggerForTests();
      const err = cap.stderr;
      assert(err.includes("WARN rate limit low remaining=12"), `stderr warn line: ${err}`);
      assert(err.includes("ERROR auth failed reason=missing_token"), `stderr error line: ${err}`);
      assert(cap.stdout === "", `no stdout writes: ${cap.stdout}`);
    } finally {
      cap.restore();
    }
  });

  await test("headless: info and debug are NOT mirrored to stderr", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    process.env.LOG_LEVEL = "debug";
    const cap = captureStdio();
    try {
      initLogger({ headless: true });
      logger.info("nothing on stderr");
      logger.debug("also nothing");
      await __resetLoggerForTests();
      assert(cap.stderr === "", `stderr should be empty: ${cap.stderr}`);
      assert(cap.stdout === "", `stdout should be empty: ${cap.stdout}`);
    } finally {
      cap.restore();
    }
  });

  // 2.9 Interactive: no stderr or stdout writes ever
  await test("interactive mode never writes to stderr or stdout for any level", async () => {
    const path = makeTmpLogPath();
    process.env.LOG_FILE = path;
    process.env.LOG_LEVEL = "debug";
    const cap = captureStdio();
    try {
      initLogger({ headless: false });
      logger.debug("d");
      logger.info("i");
      logger.warn("w");
      logger.error("e");
      await __resetLoggerForTests();
      assert(cap.stderr === "", `stderr should be empty: ${cap.stderr}`);
      assert(cap.stdout === "", `stdout should be empty: ${cap.stdout}`);
    } finally {
      cap.restore();
    }
    const lines = await readLogLines(path);
    assert(lines.length === 4, `four lines written to file: ${lines.length}`);
  });

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

void runTests();
