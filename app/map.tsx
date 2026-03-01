import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { useTranslation } from '@/i18n';
import LoadingState from '@/components/LoadingState';
import LeafletMap, { RegionData } from '@/components/LeafletMap';

const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷', Italie: '🇮🇹', Espagne: '🇪🇸', Portugal: '🇵🇹',
  Argentine: '🇦🇷', Chili: '🇨🇱', 'États-Unis': '🇺🇸', Australie: '🇦🇺',
  'Nouvelle-Zélande': '🇳🇿', 'Afrique du Sud': '🇿🇦', Allemagne: '🇩🇪',
  Canada: '🇨🇦', Grèce: '🇬🇷', Hongrie: '🇭🇺', Autriche: '🇦🇹',
  Liban: '🇱🇧', Israël: '🇮🇱', Géorgie: '🇬🇪', Uruguay: '🇺🇾',
};

interface CountryData {
  country: string;
  count: number;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
}

export default function MapScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWines, setTotalWines] = useState(0);
  const [regionData, setRegionData] = useState<RegionData | null>(null);

  useEffect(() => {
    saqApi.stats().then((data) => {
      setCountries(data.topCountries || []);
      setTotalWines(data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleCountryZoom = async (country: string) => {
    setRegionData(null);
    try {
      const [regular, vip] = await Promise.all([
        saqApi.search({ country, limit: 100 }),
        saqApi.search({ country, limit: 50, vip: true }),
      ]);
      const seen = new Set<string>();
      const allWines: any[] = [];
      for (const w of [...vip.wines, ...regular.wines]) {
        if (!seen.has(w.id)) {
          seen.add(w.id);
          allWines.push(w);
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
      setRegionData({ country, regions });
    } catch {
      setRegionData({ country, regions: [] });
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
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="globe-outline" size={20} color={COLORS.burgundy} />
        <Text style={styles.headerText}>{totalWines} {t.map.wines}</Text>
        <Text style={styles.headerSub}>· {countries.length} {t.map.countryCount}</Text>
      </View>

      <View style={styles.mapContainer}>
        <LeafletMap
          countries={countries}
          onCountryZoom={handleCountryZoom}
          onCountryNavigate={handleCountryNavigate}
          onRegionPress={handleRegionPress}
          onBackToWorld={handleBackToWorld}
          regionData={regionData}
          wineLabel={t.map.wines}
          translations={mapTranslations}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipList}
      >
        {countries.map((item) => (
          <Pressable
            key={item.country}
            style={styles.chip}
            onPress={() => handleCountryNavigate(item.country)}
          >
            <Text style={styles.chipFlag}>{COUNTRY_FLAGS[item.country] || '🏳️'}</Text>
            <Text style={styles.chipName} numberOfLines={1}>{item.country}</Text>
            <Text style={styles.chipCount}>{item.count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  headerText: { fontSize: 16, fontWeight: '700', color: COLORS.burgundy },
  headerSub: { fontSize: 14, color: COLORS.gray },
  mapContainer: { flex: 1 },
  chipScroll: {
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight + '40',
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
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.full,
  },
  chipFlag: { fontSize: 18 },
  chipName: { fontSize: 13, fontWeight: '600', color: COLORS.black, maxWidth: 100 },
  chipCount: { fontSize: 12, fontWeight: '700', color: COLORS.burgundy },
});
