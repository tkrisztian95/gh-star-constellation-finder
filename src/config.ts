import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";

const CONFIG_DIR = path.join(os.homedir(), ".config", "gh-star-constellation-finder");
const CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

export interface AppConfig {
  analyticsOptOut: boolean;
  analyticsId: string;
  analyticsNoticeSeen: boolean;
}

const DEFAULTS: AppConfig = {
  analyticsOptOut: false,
  analyticsId: "",
  analyticsNoticeSeen: false,
};

export function readConfig(): AppConfig {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function writeConfig(updates: Partial<AppConfig>): void {
  try {
    const current = readConfig();
    const next = { ...current, ...updates };
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2) + "\n", "utf-8");
  } catch {
    // Silently ignore config write failures
  }
}

export function ensureAnalyticsId(): string {
  const config = readConfig();
  if (config.analyticsId) return config.analyticsId;
  const id = randomUUID();
  writeConfig({ analyticsId: id });
  return id;
}
