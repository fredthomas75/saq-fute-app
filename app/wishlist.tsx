import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { useWishlist } from '@/context/WishlistContext';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';
import type { Wine } from '@/types/wine';

export default function WishlistScreen() {
  const t = useTranslation();
  const { wishlist } = useWishlist();
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  const displayedWines = useMemo(() => {
    let list = filterByType(wishlist as Wine[], filterType);
    return sortWines(list, sortBy);
  }, [wishlist, sortBy, filterType]);

  if (wishlist.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="bookmark-outline"
          message={t.wishlist.empty}
          submessage={t.wishlist.emptySub}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  list: { paddingBottom: SPACING.xl },
});
