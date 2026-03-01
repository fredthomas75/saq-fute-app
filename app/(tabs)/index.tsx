import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { searchCache } from '@/services/searchCache';
import SearchCacheClass from '@/services/searchCache';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import { useSearchHistory } from '@/context/SearchHistoryContext';
import SearchBar from '@/components/SearchBar';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import FilterBottomSheet, { FilterState } from '@/components/FilterBottomSheet';

const CARD_HEIGHT = 170;

export default function SearchScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ onlySale: false, onlyOrganic: false, onlyExpert: false });
  const [results, setResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef('');

  const doSearch = useCallback(async (forceRefresh = false) => {
    const searchParams: any = {
      query: queryRef.current || undefined,
      type: filters.type,
      onlySale: filters.onlySale || undefined,
      onlyOrganic: filters.onlyOrganic || undefined,
      vip: filters.onlyExpert || undefined,
      limit: 20,
    };

    // Check cache first (unless forced refresh)
    const cacheKey = SearchCacheClass.makeKey(searchParams);
    if (!forceRefresh) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        setResults(cached.wines);
        setHasSearched(true);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const data = await saqApi.search(searchParams);
      setResults(data.wines);
      setHasSearched(true);
      searchCache.set(cacheKey, data);
      if (queryRef.current && queryRef.current.length >= 2) {
        addEntry(queryRef.current, data.wines.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, t, addEntry]);

  // Handle incoming query param from map country click
  useEffect(() => {
    if (params.query) {
      setQuery(params.query);
      queryRef.current = params.query;
      doSearch();
    }
  }, [params.query, doSearch]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    queryRef.current = text;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.length >= 2) {
      timerRef.current = setTimeout(() => doSearch(), 400);
    }
  }, [doSearch]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    doSearch(true);
  }, [doSearch]);

  const handleApplyFilters = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    // doSearch will re-run due to filters dependency
  }, []);

  // Re-run search when filters change (if user has searched)
  useEffect(() => {
    if (hasSearched || filters.type || filters.onlySale || filters.onlyOrganic || filters.onlyExpert) {
      doSearch();
    }
  }, [filters]);

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    queryRef.current = q;
    doSearch();
  };

  const activeFilterCount = [filters.type, filters.onlySale, filters.onlyOrganic, filters.onlyExpert].filter(Boolean).length;

  // FlatList optimization: fixed item height
  const getItemLayout = useCallback((_: any, index: number) => ({
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      {/* Search row with filter button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrap}>
          <SearchBar
            value={query}
            onChangeText={handleQueryChange}
            onSubmit={() => doSearch()}
            placeholder={t.search.placeholder}
          />
        </View>
        <Pressable onPress={() => setShowFilters(true)} style={styles.filterBtn} hitSlop={8}>
          <Ionicons name="options-outline" size={22} color={COLORS.burgundy} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/camera')} style={styles.scanBtn} hitSlop={8}>
          <Ionicons name="scan-outline" size={22} color={COLORS.burgundy} />
        </Pressable>
      </View>

      {/* Quick type pills — fixed height, no overlap */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersContent}
      >
        {(['Rouge', 'Blanc', 'Rosé', 'Mousseux'] as const).map((type) => (
          <Pressable
            key={type}
            onPress={() => setFilters((f) => ({ ...f, type: f.type === type ? undefined : type }))}
            style={[styles.filterChip, filters.type === type && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, filters.type === type && styles.filterChipTextActive]}>
              {t.wineTypes[type] || type}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setFilters((f) => ({ ...f, onlySale: !f.onlySale }))}
          style={[styles.filterChip, filters.onlySale && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filters.onlySale && styles.filterChipTextActive]}>{t.search.promo}</Text>
        </Pressable>
        <Pressable
          onPress={() => setFilters((f) => ({ ...f, onlyOrganic: !f.onlyOrganic }))}
          style={[styles.filterChip, filters.onlyOrganic && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, filters.onlyOrganic && styles.filterChipTextActive]}>{t.search.organic}</Text>
        </Pressable>
      </ScrollView>

      {/* Search history */}
      {!hasSearched && history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{t.searchHistory.title}</Text>
            <Pressable onPress={clearHistory} hitSlop={8}>
              <Text style={styles.historyClear}>{t.searchHistory.clear}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyChips}>
            {history.map((item) => (
              <Pressable key={item.query + item.timestamp} onPress={() => handleHistoryTap(item.query)} style={styles.historyChip}>
                <Ionicons name="time-outline" size={14} color={COLORS.gray} />
                <Text style={styles.historyChipText} numberOfLines={1}>{item.query}</Text>
                <Pressable onPress={() => removeEntry(item.query)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={COLORS.grayLight} />
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Skeleton loading */}
      {loading && !refreshing && <SkeletonLoader count={4} />}

      {error && <EmptyState icon="cloud-offline-outline" message={t.search.connectionError} submessage={error} onRetry={() => doSearch()} />}

      {!loading && !error && hasSearched && results.length === 0 && (
        <EmptyState message={t.search.noResults} submessage={t.search.noResultsSub} />
      )}

      {!loading && !error && !hasSearched && history.length === 0 && (
        <EmptyState icon="search-outline" message={t.search.searchWine} submessage={t.search.searchWineSub} />
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WineCard wine={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          getItemLayout={getItemLayout}
          maxToRenderPerBatch={8}
          windowSize={5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.burgundy} />
          }
        />
      )}

      {/* Bottom sheet filters */}
      <FilterBottomSheet
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        onApply={handleApplyFilters}
        initialFilters={filters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
    gap: 6,
  },
  searchBarWrap: {
    flex: 1,
  },
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
  },
  scanBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 44,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  filterChipActive: {
    backgroundColor: COLORS.burgundy,
    borderColor: COLORS.burgundy,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  historySection: {
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
  },
  historyClear: {
    fontSize: 12,
    color: COLORS.burgundy,
  },
  historyChips: {
    gap: SPACING.sm,
  },
  historyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  historyChipText: {
    fontSize: 13,
    color: COLORS.grayDark,
    maxWidth: 120,
  },
});
