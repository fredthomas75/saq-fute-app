import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { saqApi } from '@/services/api';
import { apiCache } from '@/services/apiCache';
import type { Wine, StatsResponse } from '@/types/wine';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useFavorites } from '@/context/FavoritesContext';
import WineCard from '@/components/WineCard';

export default function HomeScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const router = useRouter();
  const { language } = useSettings();
  const { recentWines } = useRecentlyViewed();
  const { favorites } = useFavorites();

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [priceAlerts, setPriceAlerts] = useState<Wine[]>([]);

  // Fetch stats (cached 30 min)
  useEffect(() => {
    const cached = apiCache.getStats();
    if (cached) { setStats(cached); return; }
    saqApi.stats().then((data) => { apiCache.setStats(data); setStats(data); }).catch(() => {});
  }, []);

  // Fetch price alerts: favorites on sale
  useEffect(() => {
    if (favorites.length === 0) { setPriceAlerts([]); return; }
    const favIds = new Set(favorites.map((f) => f.id));
    saqApi.search({ onlySale: true, limit: 200 } as any).then((data) => {
      setPriceAlerts(data.wines.filter((w: Wine) => favIds.has(w.id)));
    }).catch(() => {});
  }, [favorites]);

  const quickActions = [
    { icon: 'search' as const, label: t.home.quickSearch, color: COLORS.burgundy, onPress: () => router.push('/search') },
    { icon: 'scan-outline' as const, label: t.home.quickScan, color: '#E67E22', onPress: () => router.push('/camera') },
    { icon: 'chatbubbles' as const, label: t.home.quickSommelier, color: '#8E44AD', onPress: () => router.push('/chat') },
    { icon: 'restaurant' as const, label: t.home.quickPairing, color: '#27AE60', onPress: () => router.push('/pairing') },
  ];

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
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.priceAlerts.title}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: SPACING.md }}>
            {priceAlerts.map((w) => (
              <WineCard key={w.id} wine={w} compact />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recently viewed wines */}
      {recentWines.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.recentlyViewed.title}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: SPACING.md }}>
            {recentWines.slice(0, 10).map((w) => (
              <WineCard key={w.id} wine={w as Wine} compact />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Trending stats */}
      {stats && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>
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
                onPress={() => router.push({ pathname: '/search', params: { query: c.country } })}
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
                onPress={() => router.push({ pathname: '/search', params: { query: g.grape } })}
                style={[styles.trendingChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}
              >
                <Text style={[styles.trendingChipText, { color: colors.black }]}>{'\u{1F347}'} {g.grape}</Text>
                <Text style={[styles.trendingChipCount, { color: colors.gray }]}>{g.count}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: SPACING.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.cream,
  },
  heroTagline: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xs,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    ...SHADOWS.card,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SPACING.md,
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
  trendingSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
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
});
