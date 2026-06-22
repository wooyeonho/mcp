import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export interface UserAlias { name: string; address: string; }
export interface UserProfile { home?: string; work?: string; aliases: UserAlias[]; recentDestination?: string; }

const DEFAULT_USER = "default";
const STORE_PATH = resolve(process.env.PROFILE_STORE_PATH ?? "./data/profiles.json");

function loadProfiles(): Map<string, UserProfile> {
  try {
    if (!existsSync(STORE_PATH)) return new Map();
    const raw = readFileSync(STORE_PATH, "utf-8");
    if (!raw.trim()) return new Map();
    return new Map(JSON.parse(raw) as Array<[string, UserProfile]>);
  } catch (error) {
    console.error("profile_store_load_error", error instanceof Error ? error.message : "unknown");
    return new Map();
  }
}

const profiles = loadProfiles();

function persistProfiles(): void {
  try {
    mkdirSync(dirname(STORE_PATH), { recursive: true });
    writeFileSync(STORE_PATH, JSON.stringify([...profiles]), "utf-8");
  } catch (error) {
    console.error("profile_store_persist_error", error instanceof Error ? error.message : "unknown");
  }
}

export function getProfile(userId = DEFAULT_USER): UserProfile {
  return profiles.get(userId) ?? { aliases: [] };
}
export function saveProfile(update: Partial<UserProfile>, userId = DEFAULT_USER): UserProfile {
  const current = getProfile(userId);
  const next: UserProfile = { ...current, ...update, aliases: update.aliases ?? current.aliases ?? [] };
  profiles.set(userId, next);
  persistProfiles();
  return next;
}
export function rememberDestination(destination: string, userId = DEFAULT_USER): void {
  const current = getProfile(userId);
  profiles.set(userId, { ...current, recentDestination: destination });
  persistProfiles();
}
