import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useFavorites } from '@/context/FavoritesContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import AnimatedListItem from '@/components/AnimatedListItem';
import EmptyState from '@/components/EmptyState';
import { SkeletonList } from '@/components/SkeletonCard';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';
import type { Wine } from '@/types/wine';

export default function FavoritesScreen() {
  const t = useTranslation();
  const colors = useThemeColors();
  const { favorites, loaded } = useFavorites();
  const { syncNow, isAuthenticated } = useAuth();
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try { await syncNow(); } catch {}
    setRefreshing(false);
  }, [syncNow, isAuthenticated]);

  const handleExport = useCallback(() => {
    if (typeof window === 'undefined' || favorites.length === 0) return;
    const rows = (favorites as Wine[]).map((w) =>
      `<tr><td>${w.name}</td><td>${w.type || ''}</td><td>${w.country || ''}</td><td>${w.grapes?.join(', ') || ''}</td><td>${w.price?.toFixed(2) || ''}$</td></tr>`
    ).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Favoris SAQ Futé</title><style>body{font-family:system-ui,sans-serif;padding:24px}h1{color:#722F37}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{text-align:left;padding:8px 12px;border-bottom:1px solid #eee}th{background:#722F37;color:#fff;font-weight:600}tr:nth-child(even){background:#f9f5f0}</style></head><body><h1>🍷 Mes Favoris — SAQ Futé</h1><p>${favorites.length} vins</p><table><thead><tr><th>Nom</th><th>Type</th><th>Pays</th><th>Cépages</th><th>Prix</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); }
  }, [favorites]);

  const displayedWines = useMemo(() => {
    let list = filterByType(favorites as Wine[], filterType);
    return sortWines(list, sortBy);
  }, [favorites, sortBy, filterType]);

  // Skeleton while loading from AsyncStorage
  if (!loaded) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cream }]}>
        <SkeletonList count={4} />
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cream }]}>
        <EmptyState
          icon="heart-outline"
          message={t.favorites.empty}
          submessage={t.favorites.emptySub}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <View style={styles.headerRow}>
        <WineListSort
          sortBy={sortBy}
          onSortChange={setSortBy}
          filterType={filterType}
          onFilterChange={setFilterType}
          resultCount={displayedWines.length}
        />
        <Pressable onPress={handleExport} style={[styles.exportBtn, { backgroundColor: colors.white }]} hitSlop={8} accessibilityLabel={t.favorites.export} accessibilityRole="button">
          <Ionicons name="download-outline" size={18} color={colors.burgundy} />
          <Text style={[styles.exportText, { color: colors.burgundy }]}>{t.favorites.export}</Text>
        </Pressable>
      </View>
      <FlatList
        data={displayedWines}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <AnimatedListItem index={index}>
            <WineCard wine={item} />
          </AnimatedListItem>
        )}
        getItemLayout={(_, index) => ({ length: 180, offset: 180 * index, index })}
        windowSize={7}
        maxToRenderPerBatch={8}
        removeClippedSubviews
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.burgundy} colors={[colors.burgundy]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingBottom: SPACING.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    marginRight: SPACING.md,
  },
  exportText: { fontSize: 13, fontWeight: '600' },
});
