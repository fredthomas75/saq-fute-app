import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStats } from '@/hooks/useStats';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useFavorites } from '@/context/FavoritesContext';
import WineCard from '@/components/WineCard';

export default function HomeScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const router = useRouter();
  const { recentWines } = useRecentlyViewed();
  const { favorites } = useFavorites();

  const stats = useStats();
  const [priceAlerts, setPriceAlerts] = useState<Wine[]>([]);

  // Stable dependency for favorites IDs
  const favIdStr = useMemo(() => favorites.map((f) => f.id).sort().join(','), [favorites]);

  // Fetch price alerts: favorites on sale (with race-condition guard)
  useEffect(() => {
    if (!favIdStr) { setPriceAlerts([]); return; }
    let cancelled = false;
    const favIds = new Set(favIdStr.split(','));
    saqApi.search({ onlySale: true, limit: 200 } as any).then((data) => {
      if (!cancelled) setPriceAlerts(data.wines.filter((w: Wine) => favIds.has(w.id)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [favIdStr]);

  // Memoized quick actions to prevent child re-renders
  const quickActions = useMemo(() => [
    { icon: 'search' as const, label: t.home.quickSearch, color: COLORS.burgundy, onPress: () => router.push('/search') },
    { icon: 'scan-outline' as const, label: t.home.quickScan, color: COLORS.orange, onPress: () => router.push('/camera') },
    { icon: 'chatbubbles' as const, label: t.home.quickSommelier, color: '#8E44AD', onPress: () => router.push('/chat') },
    { icon: 'restaurant' as const, label: t.home.quickPairing, color: COLORS.green, onPress: () => router.push('/pairing') },
  ], [t, router]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} showsVerticalScrollIndicator={false}>
      {/* Quick Actions */}
      <Text style={[styles.heroTagline, { color: colors.gray }]}>{t.home.tagline}</Text>
      <View style={styles.quickActions}>
        {quickActions.map((action) => (
          <Pressable
            key={action.label}
            onPress={action.onPress}
            style={[styles.quickCard, { backgroundColor: colors.white }]}
            accessibilityLabel={action.label}
            accessibilityRole="button"
          >
            <View style={[styles.quickIconWrap, { backgroundColor: action.color + '15' }]}>
              <Ionicons name={action.icon} size={22} color={action.color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.black }]} numberOfLines={1}>{action.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Price alerts — favorites on sale */}
      {priceAlerts.length > 0 && (
        <HorizontalWineList title={t.priceAlerts.title} wines={priceAlerts} colors={colors} />
      )}

      {/* Recently viewed wines */}
      {recentWines.length > 0 && (
        <HorizontalWineList title={t.recentlyViewed.title} wines={recentWines.slice(0, 10) as Wine[]} colors={colors} />
      )}

      {/* Trending stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>
            <Ionicons name="trending-up" size={16} color={colors.burgundy} /> {t.search.trending}
          </Text>

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
          <TrendingChips
            title={t.search.topCountries}
            items={stats.topCountries.slice(0, 8).map((c) => ({ key: c.country, label: tc(c.country), count: c.count, query: c.country }))}
            colors={colors}
            onPress={(query) => router.push({ pathname: '/search', params: { query } })}
          />

          {/* Top grapes */}
          <TrendingChips
            title={t.search.topGrapes}
            items={stats.topGrapes.slice(0, 8).map((g) => ({ key: g.grape, label: `\u{1F347} ${g.grape}`, count: g.count, query: g.grape }))}
            colors={colors}
            onPress={(query) => router.push({ pathname: '/search', params: { query } })}
          />
        </View>
      )}

      <View style={{ height: SPACING.xl * 2 }} />
    </ScrollView>
  );
}

/* ---- Extracted sub-components ---- */

function HorizontalWineList({ title, wines, colors }: { title: string; wines: Wine[]; colors: any }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.black }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: SPACING.md }}>
        {wines.map((w) => <WineCard key={w.id} wine={w} compact />)}
      </ScrollView>
    </View>
  );
}

function TrendingChips({ title, items, colors, onPress }: {
  title: string;
  items: { key: string; label: string; count: number; query: string }[];
  colors: any;
  onPress: (query: string) => void;
}) {
  return (
    <>
      <Text style={[styles.trendingSubtitle, { color: colors.black }]}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.trendingChips}>
        {items.map((item) => (
          <Pressable
            key={item.key}
            onPress={() => onPress(item.query)}
            style={[styles.trendingChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}
          >
            <Text style={[styles.trendingChipText, { color: colors.black }]}>{item.label}</Text>
            <Text style={[styles.trendingChipCount, { color: colors.gray }]}>{item.count}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </>
  );
}

/* ---- Styles ---- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  heroTagline: {
    fontSize: 15, fontWeight: '500', textAlign: 'center',
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
  },
  quickActions: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm, marginBottom: SPACING.lg },
  quickCard: {
    flex: 1, alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md, backgroundColor: COLORS.white, ...SHADOWS.card,
  },
  quickIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.xs },
  quickLabel: { fontSize: 11, fontWeight: '600', textAlign: 'center' },
  section: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: SPACING.md },
  statsRow: { flexDirection: 'row', gap: SPACING.sm },
  statCard: { flex: 1, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center', ...SHADOWS.card },
  statNumber: { fontSize: 22, fontWeight: '800' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },
  trendingSubtitle: { fontSize: 14, fontWeight: '600', marginTop: SPACING.md, marginBottom: SPACING.sm },
  trendingChips: { gap: SPACING.sm, paddingRight: SPACING.md },
  trendingChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.grayLight, ...SHADOWS.card,
  },
  trendingChipText: { fontSize: 13, fontWeight: '600' },
  trendingChipCount: { fontSize: 11, fontWeight: '500' },
});
