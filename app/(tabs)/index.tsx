import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import { useSearchHistory } from '@/context/SearchHistoryContext';
import { useTasteProfile } from '@/context/TasteProfileContext';
import SearchBar from '@/components/SearchBar';
import FilterChip from '@/components/FilterChip';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

const WINE_TYPES = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];

export default function SearchScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { history, addEntry, removeEntry, clearHistory } = useSearchHistory();
  const { profile } = useTasteProfile();
  const params = useLocalSearchParams<{ query?: string }>();
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [onlySale, setOnlySale] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [onlyExpert, setOnlyExpert] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ query: '', selectedType: undefined as string | undefined, onlySale: false, onlyOrganic: false, onlyExpert: false });

  const doSearch = useCallback(async () => {
    const s = stateRef.current;
    setLoading(true);
    setError(null);
    try {
      const data = await saqApi.search({
        query: s.query || undefined,
        type: s.selectedType,
        onlySale: s.onlySale || undefined,
        onlyOrganic: s.onlyOrganic || undefined,
        vip: s.onlyExpert || undefined,
        limit: 20,
      });
      setResults(data.wines);
      setHasSearched(true);
      if (s.query && s.query.length >= 2) {
        addEntry(s.query, data.wines.length);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [t, addEntry]);

  // Handle incoming query param from map country click
  useEffect(() => {
    if (params.query) {
      setQuery(params.query);
      stateRef.current.query = params.query;
      doSearch();
    }
  }, [params.query, doSearch]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    stateRef.current.query = text;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (text.length >= 2) {
      timerRef.current = setTimeout(doSearch, 400);
    }
  }, [doSearch]);

  const toggleType = (type: string) => {
    const newType = selectedType === type ? undefined : type;
    setSelectedType(newType);
    stateRef.current.selectedType = newType;
    doSearch();
  };

  const toggleSale = () => {
    const next = !onlySale;
    setOnlySale(next);
    stateRef.current.onlySale = next;
    doSearch();
  };

  const toggleOrganic = () => {
    const next = !onlyOrganic;
    setOnlyOrganic(next);
    stateRef.current.onlyOrganic = next;
    doSearch();
  };

  const toggleExpert = () => {
    const next = !onlyExpert;
    setOnlyExpert(next);
    stateRef.current.onlyExpert = next;
    doSearch();
  };

  const handleHistoryTap = (q: string) => {
    setQuery(q);
    stateRef.current.query = q;
    doSearch();
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchBarWrap}>
          <SearchBar
            value={query}
            onChangeText={handleQueryChange}
            onSubmit={doSearch}
            placeholder={t.search.placeholder}
          />
        </View>
        <Pressable onPress={() => router.push('/camera')} style={styles.scanBtn} hitSlop={8}>
          <Ionicons name="scan-outline" size={22} color={COLORS.burgundy} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {WINE_TYPES.map((type) => (
          <FilterChip key={type} label={type} active={selectedType === type} onPress={() => toggleType(type)} />
        ))}
        <FilterChip label={t.search.promo} active={onlySale} onPress={toggleSale} />
        <FilterChip label={t.search.organic} active={onlyOrganic} onPress={toggleOrganic} />
        <FilterChip label={t.search.expertPick} active={onlyExpert} onPress={toggleExpert} />
      </ScrollView>

      {/* Quiz banner */}
      {!profile?.completed && !hasSearched && (
        <Pressable onPress={() => router.push('/quiz')} style={styles.quizBanner}>
          <Ionicons name="sparkles" size={20} color={COLORS.gold} />
          <View style={styles.quizBannerText}>
            <Text style={styles.quizBannerTitle}>{t.quiz.start}</Text>
            <Text style={styles.quizBannerSub}>{t.quiz.startSub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
        </Pressable>
      )}

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

      {loading && <LoadingState message={t.search.loading} />}

      {error && <EmptyState icon="cloud-offline-outline" message={t.search.connectionError} submessage={error} onRetry={doSearch} />}

      {!loading && !error && hasSearched && results.length === 0 && (
        <EmptyState message={t.search.noResults} submessage={t.search.noResultsSub} />
      )}

      {!loading && !error && !hasSearched && history.length === 0 && !profile?.completed && (
        <EmptyState icon="search-outline" message={t.search.searchWine} submessage={t.search.searchWineSub} />
      )}

      {!loading && results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WineCard wine={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  },
  searchBarWrap: {
    flex: 1,
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
    maxHeight: 50,
  },
  filtersContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  list: {
    paddingBottom: SPACING.xl,
  },
  quizBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
  },
  quizBannerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  quizBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  quizBannerSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
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
