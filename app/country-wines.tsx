import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷', Italie: '🇮🇹', Espagne: '🇪🇸', Portugal: '🇵🇹',
  Argentine: '🇦🇷', Chili: '🇨🇱', 'États-Unis': '🇺🇸', Australie: '🇦🇺',
  'Nouvelle-Zélande': '🇳🇿', 'Afrique du Sud': '🇿🇦', Allemagne: '🇩🇪',
  Canada: '🇨🇦', Grèce: '🇬🇷', Hongrie: '🇭🇺', Autriche: '🇦🇹',
  Liban: '🇱🇧', Israël: '🇮🇱', Géorgie: '🇬🇪', Uruguay: '🇺🇾',
};

export default function CountryWinesScreen() {
  const t = useTranslation();
  const { country } = useLocalSearchParams<{ country: string }>();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  useEffect(() => {
    if (country) {
      saqApi.search({ query: country, limit: 100 })
        .then((data) => setWines(data.wines))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [country]);

  const regionGroups = useMemo(() => {
    const groups: Record<string, Wine[]> = {};
    wines.forEach((w) => {
      const region = decodeHtmlEntities(w.region || t.map.unknown);
      if (!groups[region]) groups[region] = [];
      groups[region].push(w);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [wines, t]);

  const displayedWines = useMemo(() => {
    let list = selectedRegion
      ? wines.filter((w) => decodeHtmlEntities(w.region || t.map.unknown) === selectedRegion)
      : wines;
    list = filterByType(list, filterType);
    return sortWines(list, sortBy);
  }, [wines, selectedRegion, sortBy, filterType, t]);

  if (loading) return <LoadingState message={t.map.loading} />;

  const flag = COUNTRY_FLAGS[country || ''] || '🏳️';

  return (
    <View style={styles.container}>
      {/* Country header */}
      <View style={styles.header}>
        <Text style={styles.flag}>{flag}</Text>
        <View style={styles.headerInfo}>
          <Text style={styles.countryName}>{country}</Text>
          <Text style={styles.countryStats}>
            {wines.length} {t.map.wines} · {regionGroups.length} {t.map.regions}
          </Text>
        </View>
      </View>

      {/* Region chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll} contentContainerStyle={styles.regionChips}>
        <Pressable
          onPress={() => setSelectedRegion(null)}
          style={[styles.regionChip, !selectedRegion && styles.regionChipActive]}
        >
          <Text style={[styles.regionChipText, !selectedRegion && styles.regionChipTextActive]}>
            {t.map.allRegions} ({wines.length})
          </Text>
        </Pressable>
        {regionGroups.map(([region, regionWines]) => (
          <Pressable
            key={region}
            onPress={() => setSelectedRegion((prev) => (prev === region ? null : region))}
            style={[styles.regionChip, selectedRegion === region && styles.regionChipActive]}
          >
            <Text style={[styles.regionChipText, selectedRegion === region && styles.regionChipTextActive]}>
              {region} ({regionWines.length})
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Sort/filter */}
      <WineListSort
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterType={filterType}
        onFilterChange={setFilterType}
        resultCount={displayedWines.length}
      />

      {/* Wine list */}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  flag: { fontSize: 40 },
  headerInfo: { flex: 1 },
  countryName: { fontSize: 22, fontWeight: '800', color: COLORS.black },
  countryStats: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  regionScroll: {
    minHeight: 42,
    maxHeight: 42,
    flexGrow: 0,
    flexShrink: 0,
  },
  regionChips: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 6,
    alignItems: 'center',
  },
  regionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  regionChipActive: {
    backgroundColor: COLORS.burgundy,
    borderColor: COLORS.burgundy,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  regionChipTextActive: {
    color: COLORS.white,
  },
  list: { paddingBottom: SPACING.xl },
});
