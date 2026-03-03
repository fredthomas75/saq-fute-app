import React, { useState, useMemo, useCallback } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useWishlist } from '@/context/WishlistContext';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';
import type { Wine } from '@/types/wine';

export default function WishlistScreen() {
  const t = useTranslation();
  const colors = useThemeColors();
  const { wishlist } = useWishlist();
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
    let list = filterByType(wishlist as Wine[], filterType);
    return sortWines(list, sortBy);
  }, [wishlist, sortBy, filterType]);

  if (wishlist.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cream }]}>
        <EmptyState
          icon="bookmark-outline"
          message={t.wishlist.empty}
          submessage={t.wishlist.emptySub}
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
        renderItem={({ item }) => <WineCard wine={item} />}
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
