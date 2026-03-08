import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { saqApi } from '@/services/api';
import SearchCache, { searchCache } from '@/services/searchCache';
import { apiCache } from '@/services/apiCache';
import type { Wine, StatsResponse } from '@/types/wine';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { hapticSelection } from '@/services/haptics';
import { useSearchHistory } from '@/context/SearchHistoryContext';
import SearchBar from '@/components/SearchBar';
import VipBanner from '@/components/VipBanner';
import WineCard from '@/components/WineCard';
import AnimatedListItem from '@/components/AnimatedListItem';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import FilterBottomSheet, { FilterState } from '@/components/FilterBottomSheet';
import WineListSort, { sortWines, type SortKey } from '@/components/WineListSort';

const PAGE_SIZE = 50; // API max — backend doesn't support pagination/offset


export default function SearchScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const router = useRouter();
  const { vipMode, language } = useSettings();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ onlySale: false, onlyOrganic: false, onlyExpert: false });
  const [results, setResults] = useState<Wine[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef('');
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [vipFallback, setVipFallback] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('default');

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
    };
  }, []);

  // Build a set of known country names from stats for smart detection
  const knownCountries = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (stats?.topCountries) {
      knownCountries.current = new Set(stats.topCountries.map((c) => c.country.toLowerCase()));
    }
  }, [stats]);

  const doSearch = useCallback(async (forceRefresh = false) => {
    const q = queryRef.current?.trim() || '';
    // If query matches a known country name, use the country param for exact filtering
    const isCountrySearch = q.length >= 2 && knownCountries.current.has(q.toLowerCase());

    const searchParams: Record<string, string | number | boolean | undefined> = {
      query: isCountrySearch ? undefined : (q || undefined),
      country: isCountrySearch ? q : undefined,
      type: filters.type,
      onlySale: filters.onlySale || undefined,
      onlyOrganic: filters.onlyOrganic || undefined,
      vip: filters.onlyExpert || vipMode || undefined,
      minPrice: filters.priceMin || undefined,
      maxPrice: filters.priceMax || undefined,
      limit: PAGE_SIZE,
    };

    // Check cache first (unless forced refresh)
    const cacheKey = SearchCache.makeKey(searchParams);
    if (!forceRefresh) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        setResults(cached.wines);
        setTotalCount(cached.count || cached.wines.length);
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
      setTotalCount(data.count || data.wines.length);
      setVipFallback(!!data.vipFallback);
      setHasSearched(true);
      searchCache.set(cacheKey, data);
      if (queryRef.current && queryRef.current.length >= 2) {
        addEntry(queryRef.current, data.count || data.wines.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filters, t, addEntry, vipMode]);

  // Fetch stats for trending section (cached 30 min)
  useEffect(() => {
    const cached = apiCache.getStats();
    if (cached) { setStats(cached); return; }
    saqApi.stats().then((data) => { apiCache.setStats(data); setStats(data); }).catch(() => {});
  }, []);

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
    } else if (text.length === 0) {
      // User cleared the search → reset to trending/home state
      setResults([]);
      setTotalCount(0);
      setHasSearched(false);
      setError(null);
      setVipFallback(false);
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

  // Re-run search when filters or vipMode change (debounced to avoid rapid API calls)
  useEffect(() => {
    if (hasSearched || filters.type || filters.onlySale || filters.onlyOrganic || filters.onlyExpert || vipMode) {
      if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current);
      filterDebounceRef.current = setTimeout(() => doSearch(), 300);
    }
  }, [filters, vipMode]);

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    queryRef.current = q;
    doSearch();
  };

  const activeFilterCount = [filters.type, filters.onlySale, filters.onlyOrganic, filters.onlyExpert].filter(Boolean).length;

  // Client-side sort on loaded results
  const sortedResults = useMemo(() => sortWines(results, sortBy), [results, sortBy]);

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
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
        <Pressable onPress={() => setShowFilters(true)} style={[styles.filterBtn, { backgroundColor: colors.white }]} hitSlop={8} accessibilityLabel={t.search.filters} accessibilityRole="button">
          <Ionicons name="options-outline" size={22} color={colors.burgundy} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
        <Pressable onPress={() => router.push('/camera')} style={[styles.scanBtn, { backgroundColor: colors.white }]} hitSlop={8} accessibilityLabel={t.camera.title} accessibilityRole="button">
          <Ionicons name="scan-outline" size={22} color={colors.burgundy} />
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
            onPress={() => { hapticSelection(); setFilters((f) => ({ ...f, type: f.type === type ? undefined : type })); }}
            style={[styles.filterChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, filters.type === type && styles.filterChipActive]}
          >
            <Text style={[styles.filterChipText, { color: colors.grayDark }, filters.type === type && styles.filterChipTextActive]}>
              {t.wineTypes[type] || type}
            </Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => { hapticSelection(); setFilters((f) => ({ ...f, onlySale: !f.onlySale })); }}
          style={[styles.filterChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, filters.onlySale && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, { color: colors.grayDark }, filters.onlySale && styles.filterChipTextActive]}>{t.search.promo}</Text>
        </Pressable>
        <Pressable
          onPress={() => { hapticSelection(); setFilters((f) => ({ ...f, onlyOrganic: !f.onlyOrganic })); }}
          style={[styles.filterChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, filters.onlyOrganic && styles.filterChipActive]}
        >
          <Text style={[styles.filterChipText, { color: colors.grayDark }, filters.onlyOrganic && styles.filterChipTextActive]}>{t.search.organic}</Text>
        </Pressable>
      </ScrollView>

      {/* VIP mode banner */}
      {vipMode && <VipBanner />}

      {/* VIP fallback info */}
      {vipFallback && hasSearched && !loading && (
        <View style={styles.vipFallbackBanner}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.orange} />
          <Text style={styles.vipFallbackText}>{t.vip.fallbackNote}</Text>
        </View>
      )}

      {/* Search history */}
      {!hasSearched && history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyTitle, { color: colors.gray }]}>{t.searchHistory.title}</Text>
            <Pressable onPress={clearHistory} hitSlop={8}>
              <Text style={[styles.historyClear, { color: colors.burgundy }]}>{t.searchHistory.clear}</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyChips}>
            {history.map((item) => (
              <Pressable key={item.query + item.timestamp} onPress={() => handleHistoryTap(item.query)} style={[styles.historyChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
                <Ionicons name="time-outline" size={14} color={colors.gray} />
                <Text style={[styles.historyChipText, { color: colors.grayDark }]} numberOfLines={1}>{item.query}</Text>
                <Pressable onPress={() => removeEntry(item.query)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={colors.gray} />
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

      {!loading && !error && !hasSearched && (
        <ScrollView style={styles.trendingScroll} showsVerticalScrollIndicator={false}>
          {/* Show search prompt if no history */}
          {history.length === 0 && (
            <EmptyState icon="search-outline" message={t.search.searchWine} submessage={t.search.searchWineSub} />
          )}

          {/* Trending stats */}
          {stats && (
            <View style={styles.trendingSection}>
              <Text style={[styles.trendingTitle, { color: colors.black }]}>
                <Ionicons name="trending-up" size={16} color={colors.burgundy} /> {t.search.trending}
              </Text>

              {/* Quick stats row */}
              <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Text style={[styles.statNumber, { color: colors.burgundy }]}>{stats.total.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray }]}>{t.search.totalWines}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Text style={[styles.statNumber, { color: COLORS.red }]}>{stats.onSale.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray }]}>{t.search.onSaleCount}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: colors.white }]}>
                  <Text style={[styles.statNumber, { color: COLORS.green }]}>{stats.organic.toLocaleString()}</Text>
                  <Text style={[styles.statLabel, { color: colors.gray }]}>{t.search.organicCount}</Text>
                </View>
              </View>

              {/* Top countries */}
              <Text style={[styles.trendingSubtitle, { color: colors.black }]}>{t.search.topCountries}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingChips}>
                {stats.topCountries.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.country}
                    onPress={() => { handleQueryChange(c.country); }}
                    style={[styles.trendingChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}
                  >
                    <Text style={[styles.trendingChipText, { color: colors.black }]}>{tc(c.country)}</Text>
                    <Text style={[styles.trendingChipCount, { color: colors.gray }]}>{c.count}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Top grapes */}
              <Text style={[styles.trendingSubtitle, { color: colors.black }]}>{t.search.topGrapes}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingChips}>
                {stats.topGrapes.slice(0, 8).map((g) => (
                  <Pressable
                    key={g.grape}
                    onPress={() => { handleQueryChange(g.grape); }}
                    style={[styles.trendingChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}
                  >
                    <Text style={[styles.trendingChipText, { color: colors.black }]}>🍇 {g.grape}</Text>
                    <Text style={[styles.trendingChipCount, { color: colors.gray }]}>{g.count}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}
        </ScrollView>
      )}

      {!loading && results.length > 0 && (
        <View style={{ flex: 1 }}>
          <WineListSort
            sortBy={sortBy}
            onSortChange={setSortBy}
            showTypeFilter={false}
            resultCount={totalCount}
          />
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onScroll={(e) => {
              setShowScrollTop(e.nativeEvent.contentOffset.y > 600);
            }}
            scrollEventThrottle={200}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.burgundy} />
            }
          >
            {sortedResults.map((item, index) => (
              <AnimatedListItem key={item.id} index={index}>
                <WineCard wine={item} />
              </AnimatedListItem>
            ))}

            {/* Show count info when there are more results than can be displayed */}
            {results.length < totalCount && (
              <View style={styles.loadingMore}>
                <Text style={[styles.loadingMoreText, { color: colors.gray }]}>
                  {results.length} / {totalCount}
                </Text>
              </View>
            )}
          </ScrollView>
          {showScrollTop && (
            <Pressable
              onPress={() => { scrollRef.current?.scrollTo({ y: 0, animated: true }); }}
              style={styles.scrollTopFab}
              accessibilityLabel="Scroll to top"
            >
              <Ionicons name="chevron-up" size={22} color={COLORS.white} />
            </Pressable>
          )}
        </View>
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
  trendingScroll: {
    flex: 1,
  },
  trendingSection: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  trendingTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
  },
  trendingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  trendingChips: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
  },
  trendingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    ...SHADOWS.card,
  },
  trendingChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  trendingChipCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  loadingMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  loadingMoreText: {
    textAlign: 'center',
    color: COLORS.gray,
    fontSize: 13,
    paddingVertical: SPACING.md,
  },
  vipFallbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.orange + '15',
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.orange + '30',
  },
  vipFallbackText: {
    fontSize: 12,
    color: COLORS.orange,
    fontWeight: '500',
    flex: 1,
  },
  scrollTopFab: {
    position: 'absolute',
    bottom: SPACING.lg,
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.card,
    elevation: 5,
  },
});
