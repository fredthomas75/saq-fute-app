import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS, VIP_COLORS } from '@/constants/theme';
import { COUNTRY_FLAGS, decodeHtmlEntities } from '@/constants/wine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { saqApi } from '@/services/api';
import { useTranslation } from '@/i18n';
import LoadingState from '@/components/LoadingState';
import LeafletMap, { RegionData } from '@/components/LeafletMap';

interface CountryData {
  country: string;
  count: number;
}

export default function MapScreen() {
  const t = useTranslation();
  const router = useRouter();
  const colors = useThemeColors();
  const { vipMode, language } = useSettings();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWines, setTotalWines] = useState(0);
  const [regionData, setRegionData] = useState<RegionData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const fetchData = async () => {
      try {
        const stats = await saqApi.stats();
        const topCountries = stats.topCountries || [];

        if (vipMode) {
          // VIP mode: batch fetch — top 3 countries in parallel, rest sequentially
          // Use limit: 1 to minimize response size, only need count
          const BATCH_SIZE = 5;
          const vipResults: CountryData[] = [];
          for (let i = 0; i < topCountries.length; i += BATCH_SIZE) {
            if (cancelled) return;
            const batch = topCountries.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
              batch.map(async (c) => {
                try {
                  const res = await saqApi.search({ country: c.country, vip: true, limit: 1, lang: language });
                  if (res.vipFallback) return { country: c.country, count: 0 };
                  return { country: c.country, count: res.count || 0 };
                } catch {
                  return { country: c.country, count: 0 };
                }
              })
            );
            vipResults.push(...batchResults);
          }
          if (cancelled) return;
          const vipCountries = vipResults.filter((c) => c.count > 0).sort((a, b) => b.count - a.count);
          const vipTotal = vipCountries.reduce((sum, c) => sum + c.count, 0);
          setCountries(vipCountries);
          setTotalWines(vipTotal);
        } else {
          if (cancelled) return;
          setCountries(topCountries);
          setTotalWines(stats.total);
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [vipMode]);

  const handleCountryZoom = async (country: string) => {
    setRegionData(null);
    try {
      let allWines: any[];
      let totalCount = 0;

      if (vipMode) {
        const res = await saqApi.search({ country, limit: 100, vip: true, lang: language });
        // If API fell back to non-VIP, no 90+ wines for this country
        allWines = res.vipFallback ? [] : res.wines;
        totalCount = res.vipFallback ? 0 : (res.count || res.wines.length);
      } else {
        const [regular, vip] = await Promise.all([
          saqApi.search({ country, limit: 100, lang: language }),
          saqApi.search({ country, limit: 50, vip: true, lang: language }),
        ]);
        // Use the regular search count as the true total for this country
        totalCount = regular.count || regular.wines.length;
        const seen = new Set<string>();
        allWines = [];
        for (const w of [...vip.wines, ...regular.wines]) {
          if (!seen.has(w.id)) {
            seen.add(w.id);
            allWines.push(w);
          }
        }
      }

      const regionMap: Record<string, { count: number; appellations: Set<string> }> = {};
      allWines.forEach((w) => {
        const region = w.region ? decodeHtmlEntities(w.region) : t.map.unknown;
        if (!regionMap[region]) {
          regionMap[region] = { count: 0, appellations: new Set() };
        }
        regionMap[region].count++;
        if (w.appellation) {
          regionMap[region].appellations.add(decodeHtmlEntities(w.appellation));
        }
      });
      const regions = Object.entries(regionMap)
        .map(([name, data]) => ({
          name,
          count: data.count,
          appellations: Array.from(data.appellations).sort(),
        }))
        .sort((a, b) => b.count - a.count);
      setRegionData({ country, totalCount, regions });
    } catch {
      setRegionData({ country, totalCount: 0, regions: [] });
    }
  };

  const handleCountryNavigate = (country: string) => {
    router.push({ pathname: '/country-wines', params: { country } });
  };

  const handleRegionPress = (country: string, region: string) => {
    router.push({ pathname: '/country-wines', params: { country, region } });
  };

  const handleBackToWorld = () => {
    setRegionData(null);
  };

  if (loading) return <LoadingState message={t.map.loading} />;

  const mapTranslations = {
    backToWorld: t.map.backToWorld,
    seeAllWines: t.map.seeAllWines,
    loadingRegions: t.map.loadingRegions,
    noRegions: t.map.noRegions,
    wines: t.map.wines,
    regions: t.map.regions,
    mapLoading: t.map.mapLoading,
    mapError: t.map.mapError,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <View style={[styles.header, { backgroundColor: colors.white }]}>
        <Ionicons name="globe-outline" size={20} color={colors.burgundy} />
        <Text style={[styles.headerText, { color: colors.burgundy }]}>
          {totalWines} {vipMode ? 'VIP' : ''} {t.map.wines}
        </Text>
        <Text style={styles.headerSub}>· {countries.length} {t.map.countryCount}</Text>
        {vipMode && (
          <View style={styles.vipBadge}>
            <Text style={styles.vipBadgeText}>90+</Text>
          </View>
        )}
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          countries={countries}
          onCountryZoom={handleCountryZoom}
          onCountryNavigate={handleCountryNavigate}
          onRegionPress={handleRegionPress}
          onBackToWorld={handleBackToWorld}
          regionData={regionData}
          wineLabel={vipMode ? 'VIP ' + t.map.wines : t.map.wines}
          translations={mapTranslations}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.chipScroll, { backgroundColor: colors.white, borderTopColor: colors.grayLight + '40' }]}
        contentContainerStyle={styles.chipList}
      >
        {countries.map((item) => (
          <Pressable
            key={item.country}
            style={[styles.chip, { backgroundColor: colors.cream }]}
            onPress={() => handleCountryNavigate(item.country)}
          >
            <Text style={styles.chipFlag}>{COUNTRY_FLAGS[item.country] || '🏳️'}</Text>
            <Text style={[styles.chipName, { color: colors.black }]} numberOfLines={1}>{item.country}</Text>
            <Text style={[styles.chipCount, { color: colors.burgundy }]}>{item.count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  headerText: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 14, color: COLORS.gray },
  vipBadge: {
    marginLeft: 'auto',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  vipBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: VIP_COLORS.text,
  },
  mapContainer: { flex: 1 },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    borderTopWidth: 1,
  },
  chipList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  chipFlag: { fontSize: 18 },
  chipName: { fontSize: 13, fontWeight: '600', maxWidth: 100 },
  chipCount: { fontSize: 12, fontWeight: '700' },
});
