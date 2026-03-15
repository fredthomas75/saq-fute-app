export interface Wine {
  id: string;
  name: string;
  type: 'Rouge' | 'Blanc' | 'Rosé' | 'Mousseux';
  price: number;
  originalPrice?: number;
  country: string;
  region?: string;
  appellation?: string;
  grapes: string[];
  tasteProfile?: string;
  description?: string;
  foodPairing?: string[];
  dealScore: number;
  dealLabel: string;
  saqUrl: string;
  onSale?: boolean;
  isOrganic?: boolean;
  isCoeurSAQFute?: boolean;
  coeurBadge?: string | null;
  savings?: number;
  priceDisplay?: string;
  rating?: number;
  reviewCount?: number;
  servingTemp?: string;
  decanting?: string;
  agingPotential?: string;
  expertRatings?: ExpertRating[];
  maxExpertScore?: number;
  expertDescription?: string;
}

export interface ExpertRating {
  source: string;
  score: number;
}

export interface SearchResponse {
  count: number;
  showing?: number;
  wines: Wine[];
  note?: string;
  disclaimer?: string;
  tip?: string | null;
  vipMode?: boolean;
  vipFallback?: boolean;
  vipNote?: string;
}

export interface DealsResponse {
  budget: string;
  count: number;
  wines: Wine[];
  vipMode?: boolean;
  disclaimer?: string;
}

export interface PairingResponse {
  dish: string;
  budget: string;
  count: number;
  wines: Wine[];
  vipMode?: boolean;
  vipFallback?: boolean;
  vipNote?: string;
  tip?: string | null;
  disclaimer?: string;
}

export interface CompareResponse {
  comparison: Wine[];
  verdict: string;
  disclaimer?: string;
  error?: string;
}

export interface AdviceResponse {
  wine: Wine & {
    conseil?: {
      service?: string;
      carafage?: string;
      conservation?: string;
      accords?: string[];
      bio?: string | null;
      coeurSAQFute?: string | null;
    };
  };
  conseil?: {
    service?: string;
    carafage?: string;
    conservation?: string;
    accords?: string[];
    bio?: string | null;
    coeurSAQFute?: string | null;
  };
  disclaimer?: string;
  error?: string;
  tip?: string;
}

export interface CoeurResponse {
  count: number;
  wines: Wine[];
  filters?: Record<string, string | null>;
  message?: string;
  tip?: string;
  disclaimer?: string;
}

export interface HealthResponse {
  status: string;
  totalWines: number;
  activeWines: number;
  version: string;
  features: string[];
  lastUpdated: string;
}

export interface StatsResponse {
  total: number;
  onSale: number;
  organic: number;
  coupsDeCoeur: number;
  priceRange: {
    min: string;
    max: string;
    median: string;
    average: string;
  };
  byType: Record<string, number>;
  topCountries: { country: string; count: number }[];
  topGrapes: { grape: string; count: number }[];
}

export interface SearchParams {
  query?: string;
  type?: string;
  country?: string;
  grape?: string;
  maxPrice?: number;
  minPrice?: number;
  tasteProfile?: string;
  onlySale?: boolean;
  onlyOrganic?: boolean;
  vip?: boolean;
  format?: string;
  limit?: number;
  offset?: number;
}
