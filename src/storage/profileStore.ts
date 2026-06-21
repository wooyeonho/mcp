import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

export interface UserAlias { name: string; address: string; }
export interface UserProfile { home?: string; work?: string; aliases: UserAlias[]; recentDestination?: string; }

const STORE_PATH = process.env.PROFILE_STORE_PATH ?? "./data/profiles.json";

const profiles = new Map<string, UserProfile>();
let loaded = false;

function loadFromDisk(): void {
  if (loaded) return;
  loaded = true;
  try {
    if (existsSync(STORE_PATH)) {
      const raw = readFileSync(STORE_PATH, "utf-8");
      const data: Record<string, UserProfile> = JSON.parse(raw);
      for (const [k, v] of Object.entries(data)) profiles.set(k, v);
    }
  } catch { /* first run or corrupted file — start fresh */ }
}

function persistToDisk(): void {
  try {
    const dir = dirname(STORE_PATH);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    const obj: Record<string, UserProfile> = {};
    for (const [k, v] of profiles) obj[k] = v;
    writeFileSync(STORE_PATH, JSON.stringify(obj, null, 2), "utf-8");
  } catch (err) {
    console.error("profile_persist_error", err instanceof Error ? err.message : "unknown");
  }
}

export function getProfile(userId: string): UserProfile {
  loadFromDisk();
  return profiles.get(userId) ?? { aliases: [] };
}

export function saveProfile(update: Partial<UserProfile>, userId: string): UserProfile {
  loadFromDisk();
  const current = getProfile(userId);
  const next: UserProfile = { ...current, ...update, aliases: update.aliases ?? current.aliases ?? [] };
  profiles.set(userId, next);
  persistToDisk();
  return next;
}

export function rememberDestination(destination: string, userId: string): void {
  loadFromDisk();
  const current = getProfile(userId);
  profiles.set(userId, { ...current, recentDestination: destination });
  persistToDisk();
}
