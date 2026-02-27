import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { useTranslation } from '@/i18n';
import LoadingState from '@/components/LoadingState';

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

export default function MapScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [countries, setCountries] = useState<CountryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalWines, setTotalWines] = useState(0);

  useEffect(() => {
    saqApi.stats().then((data) => {
      setCountries(data.topCountries || []);
      setTotalWines(data.total);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message={t.map.loading} />;

  const maxCount = countries[0]?.count || 1;

  const handleCountryPress = (country: string) => {
    router.push({ pathname: '/country-wines', params: { country } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="globe-outline" size={24} color={COLORS.burgundy} />
        <Text style={styles.headerText}>{totalWines} {t.map.wines}</Text>
      </View>

      <FlatList
        data={countries}
        keyExtractor={(item) => item.country}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const pct = item.count / maxCount;
          return (
            <Pressable onPress={() => handleCountryPress(item.country)} style={styles.card}>
              <Text style={styles.flag}>{COUNTRY_FLAGS[item.country] || '🏳️'}</Text>
              <Text style={styles.countryName} numberOfLines={1}>{item.country}</Text>
              <View style={styles.bar}>
                <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
              </View>
              <Text style={styles.count}>{item.count} {t.map.wines}</Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  headerText: { fontSize: 18, fontWeight: '700', color: COLORS.burgundy },
  list: { padding: SPACING.sm, paddingBottom: SPACING.xl },
  row: { gap: SPACING.sm, paddingHorizontal: SPACING.xs },
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.card,
  },
  flag: { fontSize: 36, marginBottom: SPACING.xs },
  countryName: { fontSize: 14, fontWeight: '700', color: COLORS.black, marginBottom: SPACING.xs },
  bar: { width: '100%', height: 4, backgroundColor: COLORS.grayLight, borderRadius: 2, marginBottom: 4 },
  barFill: { height: 4, backgroundColor: COLORS.burgundy, borderRadius: 2 },
  count: { fontSize: 12, color: COLORS.gray },
});
