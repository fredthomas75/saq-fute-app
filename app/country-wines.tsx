import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { COUNTRY_FLAGS, decodeHtmlEntities } from '@/constants/wine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import HeaderLogo from '@/components/HeaderLogo';
import WineListSort, { sortWines, filterByType, SortKey } from '@/components/WineListSort';

export default function CountryWinesScreen() {
  const t = useTranslation();
  const colors = useThemeColors();
  const { vipMode } = useSettings();
  const { country, region: initialRegion } = useLocalSearchParams<{ country: string; region?: string }>();
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(initialRegion || null);
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  useEffect(() => {
    if (country) {
      if (vipMode) {
        // VIP mode: only fetch VIP-rated wines
        saqApi.search({ country, limit: 100, vip: true })
          .then((res) => {
            // If API fell back to non-VIP, show empty — no 90+ wines for this country
            setWines(res.vipFallback ? [] : res.wines);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      } else {
        // Normal mode: fetch all wines, merge with VIP data
        Promise.all([
          saqApi.search({ country, limit: 100 }),
          saqApi.search({ country, limit: 50, vip: true }),
        ])
          .then(([regular, vip]) => {
            const seen = new Set<string>();
            const merged: Wine[] = [];
            for (const w of [...vip.wines, ...regular.wines]) {
              if (!seen.has(w.id)) {
                seen.add(w.id);
                merged.push(w);
              }
            }
            setWines(merged);
          })
          .catch(() => {})
          .finally(() => setLoading(false));
      }
    }
  }, [country, vipMode]);

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
  const subtitle = country || t.map.wines;

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <Stack.Screen
        options={{
          headerTitle: '',
          headerLeft: () => <HeaderLogo subtitle={subtitle} />,
        }}
      />

      {/* Country header */}
      <View style={[styles.header, { backgroundColor: colors.white }]}>
        <Text style={styles.flag}>{flag}</Text>
        <View style={styles.headerInfo}>
          <Text style={[styles.countryName, { color: colors.black }]}>{country}</Text>
          <Text style={styles.countryStats}>
            {wines.length} {t.map.wines} · {regionGroups.length} {t.map.regions}
            {vipMode ? ' · VIP 90+' : ''}
          </Text>
        </View>
      </View>

      {/* Region chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.regionScroll} contentContainerStyle={styles.regionChips}>
        <Pressable
          onPress={() => setSelectedRegion(null)}
          style={[styles.regionChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, !selectedRegion && styles.regionChipActive]}
        >
          <Text style={[styles.regionChipText, { color: colors.grayDark }, !selectedRegion && styles.regionChipTextActive]}>
            {t.map.allRegions} ({wines.length})
          </Text>
        </Pressable>
        {regionGroups.map(([region, regionWines]) => (
          <Pressable
            key={region}
            onPress={() => setSelectedRegion((prev) => (prev === region ? null : region))}
            style={[styles.regionChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, selectedRegion === region && styles.regionChipActive]}
          >
            <Text style={[styles.regionChipText, { color: colors.grayDark }, selectedRegion === region && styles.regionChipTextActive]}>
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  flag: { fontSize: 40 },
  headerInfo: { flex: 1 },
  countryName: { fontSize: 22, fontWeight: '800' },
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
    borderWidth: 1,
  },
  regionChipActive: {
    backgroundColor: COLORS.burgundy,
    borderColor: COLORS.burgundy,
  },
  regionChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  regionChipTextActive: {
    color: COLORS.white,
  },
  list: { paddingBottom: SPACING.xl },
});
