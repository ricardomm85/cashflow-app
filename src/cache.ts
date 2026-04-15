const TTL_MS = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  ts: number;
}

function key(spreadsheetId: string, type: string): string {
  return `cashflow.cache.${spreadsheetId}.${type}`;
}

export function readCache<T>(spreadsheetId: string, type: string): T | null {
  try {
    const raw = localStorage.getItem(key(spreadsheetId, type));
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > TTL_MS) return null;
    return entry.data;
  } catch {
    return null;
  }
}

export function writeCache<T>(spreadsheetId: string, type: string, data: T): void {
  try {
    const entry: CacheEntry<T> = { data, ts: Date.now() };
    localStorage.setItem(key(spreadsheetId, type), JSON.stringify(entry));
  } catch {
    // quota/serialize errors — ignore, cache is opportunistic
  }
}

export function invalidateCache(spreadsheetId: string, ...types: string[]): void {
  for (const t of types) {
    localStorage.removeItem(key(spreadsheetId, t));
  }
}
