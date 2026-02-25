import React, { useState, useCallback, useRef } from 'react';
import { View, FlatList, ScrollView, StyleSheet } from 'react-native';
import { COLORS, SPACING } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import SearchBar from '@/components/SearchBar';
import FilterChip from '@/components/FilterChip';
import WineCard from '@/components/WineCard';
import EmptyState from '@/components/EmptyState';
import LoadingState from '@/components/LoadingState';

const WINE_TYPES = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string | undefined>();
  const [onlySale, setOnlySale] = useState(false);
  const [onlyOrganic, setOnlyOrganic] = useState(false);
  const [results, setResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef({ query: '', selectedType: undefined as string | undefined, onlySale: false, onlyOrganic: false });

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
        limit: 20,
      });
      setResults(data.wines);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <View style={styles.container}>
      <SearchBar
        value={query}
        onChangeText={handleQueryChange}
        onSubmit={doSearch}
        placeholder="Rechercher un vin, cépage, pays..."
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={styles.filtersContent}>
        {WINE_TYPES.map((type) => (
          <FilterChip key={type} label={type} active={selectedType === type} onPress={() => toggleType(type)} />
        ))}
        <FilterChip label="🏷️ Promo" active={onlySale} onPress={toggleSale} />
        <FilterChip label="🌿 Bio" active={onlyOrganic} onPress={toggleOrganic} />
      </ScrollView>

      {loading && <LoadingState message="Recherche en cours..." />}

      {error && <EmptyState icon="cloud-offline-outline" message="Erreur de connexion" submessage={error} onRetry={doSearch} />}

      {!loading && !error && hasSearched && results.length === 0 && (
        <EmptyState message="Aucun résultat" submessage="Essaie un autre terme ou retire les filtres" />
      )}

      {!loading && !error && !hasSearched && (
        <EmptyState icon="search-outline" message="Cherche un vin" submessage="Tape un nom, cépage, pays ou appellation" />
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
});
