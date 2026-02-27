import React, { useState, useMemo } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';
import type { Wine } from '@/types/wine';

export default function FavoritesScreen() {
  const t = useTranslation();
  const { favorites } = useFavorites();
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  const displayedWines = useMemo(() => {
    let list = filterByType(favorites as Wine[], filterType);
    return sortWines(list, sortBy);
  }, [favorites, sortBy, filterType]);

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState
          icon="heart-outline"
          message={t.favorites.empty}
          submessage={t.favorites.emptySub}
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
