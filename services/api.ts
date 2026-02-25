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

async function apiCall<T>(params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const url = new URL('/api/saq', API_BASE_URL);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Erreur API: ${response.status}`);
  }
  return response.json();
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
