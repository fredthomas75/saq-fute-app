// Maps between camelCase local types and snake_case Supabase columns

// ============================================================
// FAVORITES
// ============================================================
export interface FavoritesRow {
  user_id: string;
  wine_id: string;
  name: string;
  type: string;
  price: number;
  country: string;
  deal_score?: number | null;
  deal_label?: string | null;
  saq_url?: string | null;
  grapes?: string[] | null;
  appellation?: string | null;
  region?: string | null;
  is_organic?: boolean;
  on_sale?: boolean;
  coeur_badge?: string | null;
}

export interface LocalFav {
  id: string;
  name: string;
  type: string;
  price: number;
  country: string;
  dealScore?: number;
  dealLabel?: string;
  saqUrl?: string;
  grapes?: string[];
  appellation?: string | null;
  region?: string;
  isOrganic?: boolean;
  onSale?: boolean;
  coeurBadge?: string | null;
}

export function favToRow(fav: LocalFav, userId: string): FavoritesRow {
  return {
    user_id: userId,
    wine_id: fav.id,
    name: fav.name,
    type: fav.type,
    price: fav.price,
    country: fav.country,
    deal_score: fav.dealScore ?? null,
    deal_label: fav.dealLabel ?? null,
    saq_url: fav.saqUrl ?? null,
    grapes: fav.grapes ?? null,
    appellation: fav.appellation ?? null,
    region: fav.region ?? null,
    is_organic: fav.isOrganic ?? false,
    on_sale: fav.onSale ?? false,
    coeur_badge: fav.coeurBadge ?? null,
  };
}

export function rowToFav(row: FavoritesRow): LocalFav {
  return {
    id: row.wine_id,
    name: row.name,
    type: row.type,
    price: Number(row.price),
    country: row.country,
    dealScore: row.deal_score ?? undefined,
    dealLabel: row.deal_label ?? undefined,
    saqUrl: row.saq_url ?? undefined,
    grapes: row.grapes ?? undefined,
    appellation: row.appellation,
    region: row.region ?? undefined,
    isOrganic: row.is_organic ?? undefined,
    onSale: row.on_sale ?? undefined,
    coeurBadge: row.coeur_badge,
  };
}

// ============================================================
// CELLAR
// ============================================================
export interface CellarRow {
  user_id: string;
  wine_id: string;
  name: string;
  type: string;
  price: number;
  country: string;
  quantity: number;
  date_added: number;
  notes?: string | null;
}

export interface LocalCellar {
  wineId: string;
  name: string;
  type: string;
  price: number;
  country: string;
  quantity: number;
  dateAdded: number;
  notes?: string;
}

export function cellarToRow(wine: LocalCellar, userId: string): CellarRow {
  return {
    user_id: userId,
    wine_id: wine.wineId,
    name: wine.name,
    type: wine.type,
    price: wine.price,
    country: wine.country,
    quantity: wine.quantity,
    date_added: wine.dateAdded,
    notes: wine.notes ?? null,
  };
}

export function rowToCellar(row: CellarRow): LocalCellar {
  return {
    wineId: row.wine_id,
    name: row.name,
    type: row.type,
    price: Number(row.price),
    country: row.country,
    quantity: row.quantity,
    dateAdded: row.date_added,
    notes: row.notes ?? undefined,
  };
}

// ============================================================
// WISHLIST
// ============================================================
export interface WishlistRow {
  user_id: string;
  wine_id: string;
  name: string;
  type: string;
  price: number;
  country: string;
  deal_score?: number | null;
  deal_label?: string | null;
  saq_url?: string | null;
  grapes?: string[] | null;
  appellation?: string | null;
  region?: string | null;
  is_organic?: boolean;
  on_sale?: boolean;
  coeur_badge?: string | null;
  date_added: number;
}

export interface LocalWishlist {
  id: string;
  name: string;
  type: string;
  price: number;
  country: string;
  dealScore?: number;
  dealLabel?: string;
  saqUrl?: string;
  grapes?: string[];
  appellation?: string | null;
  region?: string;
  isOrganic?: boolean;
  onSale?: boolean;
  coeurBadge?: string | null;
  dateAdded: number;
}

export function wishlistToRow(wine: LocalWishlist, userId: string): WishlistRow {
  return {
    user_id: userId,
    wine_id: wine.id,
    name: wine.name,
    type: wine.type,
    price: wine.price,
    country: wine.country,
    deal_score: wine.dealScore ?? null,
    deal_label: wine.dealLabel ?? null,
    saq_url: wine.saqUrl ?? null,
    grapes: wine.grapes ?? null,
    appellation: wine.appellation ?? null,
    region: wine.region ?? null,
    is_organic: wine.isOrganic ?? false,
    on_sale: wine.onSale ?? false,
    coeur_badge: wine.coeurBadge ?? null,
    date_added: wine.dateAdded,
  };
}

export function rowToWishlist(row: WishlistRow): LocalWishlist {
  return {
    id: row.wine_id,
    name: row.name,
    type: row.type,
    price: Number(row.price),
    country: row.country,
    dealScore: row.deal_score ?? undefined,
    dealLabel: row.deal_label ?? undefined,
    saqUrl: row.saq_url ?? undefined,
    grapes: row.grapes ?? undefined,
    appellation: row.appellation,
    region: row.region ?? undefined,
    isOrganic: row.is_organic ?? undefined,
    onSale: row.on_sale ?? undefined,
    coeurBadge: row.coeur_badge,
    dateAdded: row.date_added,
  };
}

// ============================================================
// WINE NOTES
// ============================================================
export interface WineNotesRow {
  user_id: string;
  wine_id: string;
  wine_name: string;
  note: string;
  rating?: number | null;
  date_modified: number;
}

export interface LocalWineNote {
  wineId: string;
  wineName: string;
  note: string;
  rating?: number;
  dateModified: number;
}

export function noteToRow(note: LocalWineNote, userId: string): WineNotesRow {
  return {
    user_id: userId,
    wine_id: note.wineId,
    wine_name: note.wineName,
    note: note.note,
    rating: note.rating ?? null,
    date_modified: note.dateModified,
  };
}

export function rowToNote(row: WineNotesRow): LocalWineNote {
  return {
    wineId: row.wine_id,
    wineName: row.wine_name,
    note: row.note,
    rating: row.rating ?? undefined,
    dateModified: row.date_modified,
  };
}

// ============================================================
// SETTINGS
// ============================================================
export interface SettingsRow {
  user_id: string;
  language: string;
  theme: string;
  notifications: boolean;
  vip_mode: boolean;
  updated_at?: string;
}

export interface LocalSettings {
  language: string;
  theme: string;
  notifications: boolean;
  vipMode: boolean;
}

export function settingsToRow(s: LocalSettings, userId: string): SettingsRow {
  return {
    user_id: userId,
    language: s.language,
    theme: s.theme,
    notifications: s.notifications,
    vip_mode: s.vipMode,
  };
}

export function rowToSettings(row: SettingsRow): LocalSettings {
  return {
    language: row.language,
    theme: row.theme as any,
    notifications: row.notifications,
    vipMode: row.vip_mode,
  };
}
