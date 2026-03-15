import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { saqApi } from '@/services/api';
import SearchCache, { searchCache } from '@/services/searchCache';
import type { Wine } from '@/types/wine';
import { useStats } from '@/hooks/useStats';
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

const PAGE_SIZE = 20;

// Find the main scrollable container in DOM (web only)
function findScrollContainer(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  return Array.from(document.querySelectorAll('*')).filter(
    (e): e is HTMLElement => e instanceof HTMLElement &&
      e.scrollHeight > e.clientHeight + 200 && e.clientHeight > 100 &&
      ['auto', 'scroll'].includes(getComputedStyle(e).overflowY)
  ).sort((a, b) => b.scrollHeight - a.scrollHeight)[0] || null;
}


export default function SearchScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const router = useRouter();
  const { vipMode, language } = useSettings();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();
  const params = useLocalSearchParams<{ query?: string; onlySale?: string; onlyOrganic?: string }>();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({ onlySale: false, onlyOrganic: false, onlyExpert: false, only750ml: true });
  const [results, setResults] = useState<Wine[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadingMoreGuard = useRef(false); // synchronous guard to prevent double-fire
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryRef = useRef('');
  const pageRef = useRef(0);
  const filterDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollElRef = useRef<HTMLElement | null>(null); // cached DOM scroll container
  const stats = useStats();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [vipFallback, setVipFallback] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [allResults, setAllResults] = useState<Wine[] | null>(null); // full result set for sorting
  const [loadingAll, setLoadingAll] = useState(false);
  const loadingAllRef = useRef(false); // sync guard for fetchAll
  const [sortedDisplayCount, setSortedDisplayCount] = useState(PAGE_SIZE); // paginate sorted view
  const [fetchProgress, setFetchProgress] = useState<{ loaded: number; total: number } | null>(null);

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

  // Shared search params builder — used by both doSearch and loadMore
  const buildSearchParams = useCallback((offset?: number) => {
    const q = queryRef.current?.trim() || '';
    const isCountrySearch = q.length >= 2 && knownCountries.current.has(q.toLowerCase());
    // Country from filter takes priority; if none, fall back to country search detection
    const country = filters.country || (isCountrySearch ? q : undefined);
    const appellation = filters.appellation?.trim();
    const baseQuery = (isCountrySearch && !filters.country) ? undefined : (q || undefined);
    const combinedQuery = [baseQuery, appellation].filter(Boolean).join(' ') || undefined;
    return {
      query: combinedQuery,
      country: country || undefined,
      grape: filters.grape || undefined,
      type: filters.type,
      onlySale: filters.onlySale || undefined,
      onlyOrganic: filters.onlyOrganic || undefined,
      vip: filters.onlyExpert || vipMode || undefined,
      format: filters.only750ml ? undefined : 'all',
      minPrice: filters.priceMin || undefined,
      maxPrice: filters.priceMax || undefined,
      limit: PAGE_SIZE,
      ...(offset !== undefined && { offset }),
    } as Record<string, string | number | boolean | undefined>;
  }, [filters, vipMode]);

  const doSearch = useCallback(async (forceRefresh = false) => {
    const searchParams = buildSearchParams();

    // Check cache first (unless forced refresh)
    const cacheKey = SearchCache.makeKey(searchParams);
    if (!forceRefresh) {
      const cached = searchCache.get(cacheKey);
      if (cached) {
        setResults(cached.wines);
        setTotalCount(cached.count || cached.wines.length);
        setHasSearched(true);
        setLoading(false);
        pageRef.current = 1;
        return;
      }
    }

    setLoading(true);
    setError(null);
    setAllResults(null); // clear full cache on new search
    setSortedDisplayCount(PAGE_SIZE);
    pageRef.current = 0;
    try {
      const data = await saqApi.search(searchParams);
      setResults(data.wines);
      setTotalCount(data.count || data.wines.length);
      setVipFallback(!!data.vipFallback);
      setHasSearched(true);
      pageRef.current = 1;
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
  }, [buildSearchParams, t, addEntry]);

  // Refs for loadMore to read without causing re-creation of the callback
  const resultsLenRef = useRef(results.length);
  resultsLenRef.current = results.length;
  const totalCountRef = useRef(totalCount);
  totalCountRef.current = totalCount;
  const loadingRef = useRef(loading);
  loadingRef.current = loading;

  // Load more results (infinite scroll) — stable callback via refs
  const loadMore = useCallback(async () => {
    if (loadingMoreGuard.current || loadingRef.current || resultsLenRef.current >= totalCountRef.current) return;
    loadingMoreGuard.current = true; // synchronous guard
    const offset = pageRef.current * PAGE_SIZE;
    setLoadingMore(true);
    try {
      const data = await saqApi.search(buildSearchParams(offset));
      if (data.wines.length > 0) {
        setResults((prev) => {
          const ids = new Set(prev.map((w) => w.id));
          const newWines = data.wines.filter((w: Wine) => !ids.has(w.id));
          return [...prev, ...newWines];
        });
        pageRef.current++;
      }
    } catch {
      // Silently fail — user can scroll again to retry
    } finally {
      loadingMoreGuard.current = false;
      setLoadingMore(false);
    }
  }, [buildSearchParams]);

  // Fetch ALL results when sort is active (API max 200 per batch, parallel)
  const FETCH_ALL_BATCH = 200;
  const fetchAllResults = useCallback(async () => {
    if (loadingAllRef.current) return;
    loadingAllRef.current = true;
    setLoadingAll(true);
    try {
      const baseParams = buildSearchParams();
      // First batch: get total count
      const first = await saqApi.search({ ...baseParams, limit: FETCH_ALL_BATCH, offset: 0 } as any);
      const total = first.count || first.wines.length;
      let all: Wine[] = [...first.wines];
      let loaded = all.length;
      setFetchProgress({ loaded, total });

      if (all.length < total) {
        // Remaining batches in parallel
        const promises: Promise<any>[] = [];
        for (let off = FETCH_ALL_BATCH; off < total; off += FETCH_ALL_BATCH) {
          promises.push(
            saqApi.search({ ...baseParams, limit: FETCH_ALL_BATCH, offset: off } as any).then((data) => {
              loaded += data.wines.length;
              setFetchProgress({ loaded, total });
              return data;
            })
          );
        }
        const results = await Promise.all(promises);
        for (const data of results) all = [...all, ...data.wines];
      }
      // Deduplicate
      const seen = new Set<string>();
      const unique = all.filter((w) => { if (seen.has(w.id)) return false; seen.add(w.id); return true; });
      setAllResults(unique);
    } catch {
      // Keep existing partial results
    } finally {
      loadingAllRef.current = false;
      setLoadingAll(false);
      setFetchProgress(null);
    }
  }, [buildSearchParams]);

  // Trigger fetchAll when sort is activated and we don't have all results yet
  useEffect(() => {
    setSortedDisplayCount(PAGE_SIZE); // reset pagination on sort change
    if (sortBy !== 'default' && !allResults && hasSearched && totalCount > results.length && !loadingAllRef.current) {
      fetchAllResults();
    }
  }, [sortBy, allResults, hasSearched, totalCount, results.length, fetchAllResults]);

  // Handle incoming query/filter params from home screen tiles or map
  // Always reset filters to avoid accumulation across navigations
  const doSearchRef = useRef(doSearch);
  doSearchRef.current = doSearch;
  useEffect(() => {
    if (!params.query && !params.onlySale && !params.onlyOrganic) return;
    const freshFilters: FilterState = {
      onlySale: params.onlySale === 'true',
      onlyOrganic: params.onlyOrganic === 'true',
      onlyExpert: false,
      only750ml: true,
    };
    setFilters(freshFilters);
    if (params.query) {
      setQuery(params.query);
      queryRef.current = params.query;
    } else {
      setQuery('');
      queryRef.current = '';
    }
    // Defer search to next tick so filters state has propagated
    setTimeout(() => doSearchRef.current(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.query, params.onlySale, params.onlyOrganic]);

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

  const activeFilterCount = [filters.type, filters.country, filters.grape, filters.appellation, filters.onlySale, filters.onlyOrganic, filters.onlyExpert].filter(Boolean).length;

  // Native DOM scroll listener — backup for infinite scroll on web
  // Uses cached scroll container ref to avoid expensive querySelectorAll('*') every time
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  const sortByRef = useRef(sortBy);
  sortByRef.current = sortBy;
  const allResultsRef = useRef(allResults);
  allResultsRef.current = allResults;
  useEffect(() => {
    if (typeof document === 'undefined' || results.length === 0) return;
    const inSortMode = sortBy !== 'default' && allResults;
    if (!inSortMode && results.length >= totalCount) return;
    const timer = setTimeout(() => {
      if (!scrollElRef.current || !document.body.contains(scrollElRef.current)) {
        scrollElRef.current = findScrollContainer();
      }
      const el = scrollElRef.current;
      if (!el) return;
      const handler = () => {
        if (el.scrollHeight - el.scrollTop - el.clientHeight < el.clientHeight * 1.5) {
          if (sortByRef.current !== 'default' && allResultsRef.current) {
            setSortedDisplayCount((c) => Math.min(c + PAGE_SIZE, allResultsRef.current!.length));
          } else {
            loadMoreRef.current();
          }
        }
      };
      el.addEventListener('scroll', handler, { passive: true });
      (window as any).__scrollCleanup = () => el.removeEventListener('scroll', handler);
    }, 300);
    return () => { clearTimeout(timer); (window as any).__scrollCleanup?.(); };
  }, [results.length, totalCount, sortBy, allResults]);

  // Memoized scroll handler — avoids re-creating on every render
  const handleScroll = useCallback((e: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    setShowScrollTop(contentOffset.y > 600);
    const distFromBottom = contentSize.height - contentOffset.y - layoutMeasurement.height;
    if (distFromBottom < layoutMeasurement.height * 1.5) {
      if (sortBy !== 'default' && allResults) {
        // Show more sorted results progressively
        setSortedDisplayCount((c) => Math.min(c + PAGE_SIZE, allResults.length));
      } else {
        loadMore();
      }
    }
  }, [loadMore, sortBy, allResults]);

  // Client-side sort — use allResults when fully loaded, paginate display
  const sortedResults = useMemo(() => {
    if (sortBy !== 'default' && allResults) {
      return sortWines(allResults, sortBy).slice(0, sortedDisplayCount);
    }
    return sortWines(results, sortBy);
  }, [results, allResults, sortBy, sortedDisplayCount]);

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

      {!loading && !error && !hasSearched && history.length === 0 && (
        <EmptyState icon="search-outline" message={t.search.searchWine} submessage={t.search.searchWineSub} />
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
            onScroll={handleScroll}
            scrollEventThrottle={200}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.burgundy} />
            }
          >
            {sortedResults.map((item, index) => (
              <AnimatedListItem key={item.id} index={index} skipAnimation={index >= PAGE_SIZE}>
                <WineCard wine={item} />
              </AnimatedListItem>
            ))}

            {/* Footer: loading all for sort, loading more, or count */}
            {loadingAll && (
              <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={colors.burgundy} />
                <Text style={[styles.loadingMoreText, { color: colors.gray }]}>
                  {fetchProgress ? `${fetchProgress.loaded} / ${fetchProgress.total}...` : t.common.loading}
                </Text>
              </View>
            )}
            {!loadingAll && sortBy !== 'default' && allResults && sortedDisplayCount < allResults.length && (
              <Pressable onPress={() => setSortedDisplayCount((c) => Math.min(c + PAGE_SIZE, allResults.length))} style={styles.loadingMore}>
                <Text style={[styles.loadingMoreText, { color: colors.burgundy }]}>
                  {sortedDisplayCount} / {allResults.length}
                </Text>
              </Pressable>
            )}
            {!loadingAll && sortBy === 'default' && results.length < totalCount && (
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={colors.burgundy} />
                  <Text style={[styles.loadingMoreText, { color: colors.gray }]}>{t.common.loading}</Text>
                </View>
              ) : (
                <Pressable onPress={loadMore} style={styles.loadingMore}>
                  <Text style={[styles.loadingMoreText, { color: colors.burgundy }]}>
                    {results.length} / {totalCount}
                  </Text>
                </Pressable>
              )
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
        countries={stats?.topCountries}
        grapes={stats?.topGrapes}
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
