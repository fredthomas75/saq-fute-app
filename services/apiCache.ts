/**
 * Lightweight in-memory cache for API responses.
 * - Stats: 30 min TTL (rarely changes)
 * - Pairings: 10 min TTL (per dish)
 * - Deals by budget: 5 min TTL (per budget+vip combo)
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function get<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function set<T>(key: string, data: T): void {
  // Evict if too many entries
  if (cache.size > 100) {
    const first = cache.keys().next().value;
    if (first) cache.delete(first);
  }
  cache.set(key, { data, timestamp: Date.now() });
}

function invalidate(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

function clear(): void {
  cache.clear();
}

// --- TTL constants ---
const STATS_TTL = 30 * 60 * 1000;    // 30 minutes
const PAIRING_TTL = 10 * 60 * 1000;  // 10 minutes
const DEALS_TTL = 5 * 60 * 1000;     // 5 minutes

export const apiCache = {
  // Stats
  getStats: () => get<any>('stats', STATS_TTL),
  setStats: (data: any) => set('stats', data),

  // Pairings — keyed by dish + vip
  getPairing: (dish: string, vip?: boolean) => get<any>(`pairing:${dish}:${vip || ''}`, PAIRING_TTL),
  setPairing: (dish: string, vip: boolean | undefined, data: any) => set(`pairing:${dish}:${vip || ''}`, data),

  // Deals — keyed by budget + vip
  getDeals: (budget: number, vip?: boolean) => get<any>(`deals:${budget}:${vip || ''}`, DEALS_TTL),
  setDeals: (budget: number, vip: boolean | undefined, data: any) => set(`deals:${budget}:${vip || ''}`, data),

  // Invalidation helpers
  invalidateDeals: () => invalidate('deals:'),
  invalidatePairings: () => invalidate('pairing:'),
  clear,
};
