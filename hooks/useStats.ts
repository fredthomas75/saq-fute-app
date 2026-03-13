import { useEffect, useState } from 'react';
import { saqApi } from '@/services/api';
import { apiCache } from '@/services/apiCache';
import type { StatsResponse } from '@/types/wine';

/** Pending promise singleton — prevents duplicate concurrent fetches */
let pending: Promise<StatsResponse> | null = null;

/** Shared hook: fetch stats with cache + dedup */
export function useStats() {
  const [stats, setStats] = useState<StatsResponse | null>(() => apiCache.getStats());

  useEffect(() => {
    if (stats) return; // already have cached data from initial state
    if (!pending) {
      pending = saqApi.stats()
        .then((data) => { apiCache.setStats(data); pending = null; return data; })
        .catch((e) => { pending = null; throw e; });
    }
    pending.then(setStats).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return stats;
}
