import { formatDuration } from "../util/duration.js";

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(formatDuration(0), "0ms", "zero ms");
assertEqual(formatDuration(850), "850ms", "sub-second");
assertEqual(formatDuration(4200), "4s", "single-digit seconds");
assertEqual(formatDuration(60_000), "1m 0s", "exactly one minute");
assertEqual(formatDuration(134_000), "2m 14s", "minutes plus seconds");
assertEqual(formatDuration(999), "999ms", "just under one second");
assertEqual(formatDuration(1000), "1s", "exactly one second");
assertEqual(formatDuration(59_499), "59s", "just under one minute rounds down");
assertEqual(formatDuration(59_500), "1m 0s", "boundary rounds up to one minute");

console.log("duration.test.ts: all assertions passed");
