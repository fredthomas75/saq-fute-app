import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, FlatList, RefreshControl, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';

export default function CoupsDeCoeurScreen() {
  const t = useTranslation();
  const { language } = useSettings();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  const fetchCoeurs = useCallback(async () => {
    setError(null);
    try {
      const res = await saqApi.coeur({ limit: 100, lang: language });
      setWines(res.wines);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    fetchCoeurs();
  }, [fetchCoeurs]);

  const displayedWines = useMemo(() => {
    let list = filterByType(wines, filterType);
    return sortWines(list, sortBy);
  }, [wines, sortBy, filterType]);

  if (loading) return <LoadingState message={t.deals.loading} />;
  if (error) return <EmptyState icon="cloud-offline-outline" message={t.deals.error} submessage={error} onRetry={fetchCoeurs} />;

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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchCoeurs(); }}
            tintColor={COLORS.burgundy}
            colors={[COLORS.burgundy]}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="heart-outline"
            message={t.deals.noDeal}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  list: { paddingBottom: SPACING.xl },
});
