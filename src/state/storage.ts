// localStorage can be missing or throw (private mode, blocked storage), so every access is guarded.
// Nothing here is a source of truth: losing it only resets the user's draft brief or shortlist.

export function readJSON<T>(key: string): T | undefined {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? undefined : (JSON.parse(raw) as T);
  } catch {
    return undefined;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable: keep working in memory.
  }
}
