import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
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
      <WineListSort
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterType={filterType}
        onFilterChange={setFilterType}
        resultCount={displayedWines.length}
      />
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
});
