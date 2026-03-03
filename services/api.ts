import { API_BASE_URL } from '@/constants/api';
import type {
  SearchResponse,
  DealsResponse,
  PairingResponse,
  CompareResponse,
  AdviceResponse,
  CoeurResponse,
  HealthResponse,
  StatsResponse,
  SearchParams,
} from '@/types/wine';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [500, 1500, 3000]; // ms
const API_TIMEOUT_MS = 15000; // 15s per request

async function apiCall<T>(params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL('/api/saq', API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
      const response = await fetch(url.toString(), { signal: controller.signal }).finally(() => clearTimeout(timer));
      if (!response.ok) {
        const err = new Error(`Erreur API: ${response.status}`);
        (err as any).status = response.status;
        throw err;
      }
      const data = await response.json();
      return data as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry client errors (4xx) — they won't self-heal
      const status = (lastError as any).status;
      if (typeof status === 'number' && status >= 400 && status < 500) {
        throw lastError;
      }

      // If we have retries left, wait with exponential backoff
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }

  throw lastError!;
}

export const saqApi = {
  search: (params: SearchParams) =>
    apiCall<SearchResponse>({ action: 'search', ...params }),

  deals: (params: { budget?: number; type?: string; limit?: number; vip?: boolean }) =>
    apiCall<DealsResponse>({ action: 'deals', ...params }),

  pairing: (params: { dish: string; budget?: number; vip?: boolean }) =>
    apiCall<PairingResponse>({ action: 'pairing', ...params }),

  compare: (wine1: string, wine2: string) =>
    apiCall<CompareResponse>({ action: 'compare', wine1, wine2 }),

  advice: (wine: string) =>
    apiCall<AdviceResponse>({ action: 'advice', wine }),

  coeur: (params?: { type?: string; budget?: number; grape?: string; country?: string; sort?: string; limit?: number }) =>
    apiCall<CoeurResponse>({ action: 'coeur', ...params }),

  browse: (query: string) =>
    apiCall<SearchResponse>({ action: 'browse', query }),

  health: () => apiCall<HealthResponse>({ action: 'health' }),

  stats: () => apiCall<StatsResponse>({ action: 'stats' }),
};
