export interface UserAlias { name: string; address: string; }
export interface UserProfile { home?: string; work?: string; aliases: UserAlias[]; recentDestination?: string; }

const profiles = new Map<string, UserProfile>();
const DEFAULT_USER = "default";

export function getProfile(userId = DEFAULT_USER): UserProfile {
  return profiles.get(userId) ?? { aliases: [] };
}
export function saveProfile(update: Partial<UserProfile>, userId = DEFAULT_USER): UserProfile {
  const current = getProfile(userId);
  const next: UserProfile = { ...current, ...update, aliases: update.aliases ?? current.aliases ?? [] };
  profiles.set(userId, next);
  return next;
}
export function rememberDestination(destination: string, userId = DEFAULT_USER): void {
  const current = getProfile(userId);
  profiles.set(userId, { ...current, recentDestination: destination });
}
