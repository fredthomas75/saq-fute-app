import { supabase } from './supabase';
import {
  favToRow, rowToFav,

  wishlistToRow, rowToWishlist,
  noteToRow, rowToNote,
  settingsToRow, rowToSettings,
  type LocalFav, type LocalWishlist, type LocalWineNote, type LocalSettings,
} from './syncMappers';

// ============================================================
// DEBOUNCE — prevents hammering Supabase on rapid state changes
// ============================================================
const timers: Record<string, ReturnType<typeof setTimeout>> = {};

export function debouncedSync(table: string, fn: () => Promise<void>, delay = 500, onError?: (err: any) => void): void {
  if (timers[table]) clearTimeout(timers[table]);
  timers[table] = setTimeout(() => {
    fn().catch((err) => {
      console.warn(`[sync:${table}]`, err);
      onError?.(err);
    });
  }, delay);
}

// ============================================================
// FAVORITES
// ============================================================
export async function pushFavorites(userId: string, local: LocalFav[]): Promise<void> {
  if (local.length === 0) return;
  const rows = local.map((f) => favToRow(f, userId));
  const { error } = await supabase.from('favorites').upsert(rows, { onConflict: 'user_id,wine_id' });
  if (error) throw error;
}

export async function pullFavorites(userId: string): Promise<LocalFav[]> {
  const { data, error } = await supabase.from('favorites').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(rowToFav);
}

export async function deleteFavoriteCloud(userId: string, wineId: string): Promise<void> {
  await supabase.from('favorites').delete().match({ user_id: userId, wine_id: wineId });
}

export async function clearFavoritesCloud(userId: string): Promise<void> {
  await supabase.from('favorites').delete().eq('user_id', userId);
}

export async function mergeFavorites(userId: string, local: LocalFav[]): Promise<LocalFav[]> {
  const cloud = await pullFavorites(userId);
  const map = new Map<string, LocalFav>();
  for (const f of cloud) map.set(f.id, f);
  for (const f of local) map.set(f.id, f); // local wins for same id
  const merged = Array.from(map.values());
  await pushFavorites(userId, merged);
  return merged;
}

// ============================================================
// WISHLIST
// ============================================================
export async function pushWishlist(userId: string, local: LocalWishlist[]): Promise<void> {
  if (local.length === 0) return;
  const rows = local.map((w) => wishlistToRow(w, userId));
  const { error } = await supabase.from('wishlist').upsert(rows, { onConflict: 'user_id,wine_id' });
  if (error) throw error;
}

export async function pullWishlist(userId: string): Promise<LocalWishlist[]> {
  const { data, error } = await supabase.from('wishlist').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(rowToWishlist);
}

export async function deleteWishlistCloud(userId: string, wineId: string): Promise<void> {
  await supabase.from('wishlist').delete().match({ user_id: userId, wine_id: wineId });
}

export async function clearWishlistCloud(userId: string): Promise<void> {
  await supabase.from('wishlist').delete().eq('user_id', userId);
}

export async function mergeWishlist(userId: string, local: LocalWishlist[]): Promise<LocalWishlist[]> {
  const cloud = await pullWishlist(userId);
  const map = new Map<string, LocalWishlist>();
  for (const w of cloud) map.set(w.id, w);
  for (const w of local) map.set(w.id, w); // local wins
  const merged = Array.from(map.values());
  await pushWishlist(userId, merged);
  return merged;
}

// ============================================================
// WINE NOTES
// ============================================================
export async function pushWineNotes(userId: string, local: LocalWineNote[]): Promise<void> {
  if (local.length === 0) return;
  const rows = local.map((n) => noteToRow(n, userId));
  const { error } = await supabase.from('wine_notes').upsert(rows, { onConflict: 'user_id,wine_id' });
  if (error) throw error;
}

export async function pullWineNotes(userId: string): Promise<LocalWineNote[]> {
  const { data, error } = await supabase.from('wine_notes').select('*').eq('user_id', userId);
  if (error) throw error;
  return (data || []).map(rowToNote);
}

export async function deleteNoteCloud(userId: string, wineId: string): Promise<void> {
  await supabase.from('wine_notes').delete().match({ user_id: userId, wine_id: wineId });
}

export async function clearNotesCloud(userId: string): Promise<void> {
  await supabase.from('wine_notes').delete().eq('user_id', userId);
}

export async function mergeWineNotes(userId: string, local: LocalWineNote[]): Promise<LocalWineNote[]> {
  const cloud = await pullWineNotes(userId);
  const map = new Map<string, LocalWineNote>();
  for (const n of cloud) map.set(n.wineId, n);
  for (const n of local) {
    const existing = map.get(n.wineId);
    if (existing) {
      map.set(n.wineId, n.dateModified >= existing.dateModified ? n : existing);
    } else {
      map.set(n.wineId, n);
    }
  }
  const merged = Array.from(map.values());
  await pushWineNotes(userId, merged);
  return merged;
}

// ============================================================
// SETTINGS
// ============================================================
export async function pushSettings(userId: string, local: LocalSettings): Promise<void> {
  const row = settingsToRow(local, userId);
  const { error } = await supabase.from('user_settings').upsert(row, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function pullSettings(userId: string): Promise<LocalSettings | null> {
  const { data, error } = await supabase.from('user_settings').select('*').eq('user_id', userId).single();
  if (error || !data) return null;
  return rowToSettings(data);
}

export async function mergeSettings(userId: string, local: LocalSettings): Promise<LocalSettings> {
  const cloud = await pullSettings(userId);
  if (!cloud) {
    // First login — push local settings to cloud
    await pushSettings(userId, local);
    return local;
  }
  // Cloud exists — cloud wins (settings from another device take precedence)
  await pushSettings(userId, cloud);
  return cloud;
}
