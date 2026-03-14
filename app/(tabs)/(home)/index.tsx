import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { COUNTRY_FLAGS } from '@/constants/wine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStats } from '@/hooks/useStats';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useFavorites } from '@/context/FavoritesContext';
import WineCard from '@/components/WineCard';

const MAX_W = 520;

export default function HomeScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const router = useRouter();
  const { recentWines } = useRecentlyViewed();
  const { favorites } = useFavorites();

  const stats = useStats();
  const [priceAlerts, setPriceAlerts] = useState<Wine[]>([]);

  const isEvening = new Date().getHours() >= 18;
  const greeting = isEvening ? t.home.greetingEvening : t.home.greeting;

  const favIdStr = useMemo(() => favorites.map((f) => f.id).sort().join(','), [favorites]);

  useEffect(() => {
    if (!favIdStr) { setPriceAlerts([]); return; }
    let cancelled = false;
    const favIds = new Set(favIdStr.split(','));
    saqApi.search({ onlySale: true, limit: 200 } as any).then((data) => {
      if (!cancelled) setPriceAlerts(data.wines.filter((w: Wine) => favIds.has(w.id)));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [favIdStr]);

  const quickActions = useMemo(() => [
    { icon: 'search' as const, label: t.home.quickSearch, sub: t.home.quickSearchSub, gradient: ['#5A252C', '#8B3A42'] as const, onPress: () => router.push('/search') },
    { icon: 'scan-outline' as const, label: t.home.quickScan, sub: t.home.quickScanSub, gradient: ['#6B4226', '#A0693D'] as const, onPress: () => router.push('/camera') },
    { icon: 'chatbubbles' as const, label: t.home.quickSommelier, sub: t.home.quickSommelierSub, gradient: ['#3D2645', '#5E3A6E'] as const, onPress: () => router.push('/chat') },
    { icon: 'restaurant' as const, label: t.home.quickPairing, sub: t.home.quickPairingSub, gradient: ['#2D4A3E', '#3D6B56'] as const, onPress: () => router.push('/pairing') },
  ], [t, router]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} showsVerticalScrollIndicator={false}>
      <View style={styles.contentWrap}>

        {/* Hero greeting */}
        <View style={styles.hero}>
          <Text style={[styles.greeting, { color: colors.burgundy }]}>{greeting} 👋</Text>
          <Text style={[styles.subtitle, { color: colors.gray }]}>{t.home.subtitle}</Text>
        </View>

        {/* Quick Actions — 2x2 grid */}
        <View style={styles.actionsGrid}>
          <View style={styles.actionsRow}>
            {quickActions.slice(0, 2).map((action, i) => (
              <AnimatedTile key={action.label} index={i}>
                <Pressable
                  onPress={action.onPress}
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}
                >
                  <LinearGradient
                    colors={action.gradient as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionIconWrap}>
                      <Ionicons name={action.icon} size={22} color="rgba(255,255,255,0.9)" />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSub}>{action.sub}</Text>
                  </LinearGradient>
                </Pressable>
              </AnimatedTile>
            ))}
          </View>
          <View style={styles.actionsRow}>
            {quickActions.slice(2, 4).map((action, i) => (
              <AnimatedTile key={action.label} index={i + 2}>
                <Pressable
                  onPress={action.onPress}
                  accessibilityLabel={action.label}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.actionTile, pressed && styles.actionTilePressed]}
                >
                  <LinearGradient
                    colors={action.gradient as unknown as string[]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.actionGradient}
                  >
                    <View style={styles.actionIconWrap}>
                      <Ionicons name={action.icon} size={22} color="rgba(255,255,255,0.9)" />
                    </View>
                    <Text style={styles.actionLabel}>{action.label}</Text>
                    <Text style={styles.actionSub}>{action.sub}</Text>
                  </LinearGradient>
                </Pressable>
              </AnimatedTile>
            ))}
          </View>
        </View>

        {/* Price alerts */}
        {priceAlerts.length > 0 && (
          <FadeInSection delay={200}>
            <HorizontalWineList title={t.priceAlerts.title} wines={priceAlerts} colors={colors} />
          </FadeInSection>
        )}

        {/* Recently viewed */}
        {recentWines.length > 0 && (
          <FadeInSection delay={300}>
            <HorizontalWineList title={t.recentlyViewed.title} wines={recentWines.slice(0, 10) as Wine[]} colors={colors} />
          </FadeInSection>
        )}

        {/* Stats */}
        {stats && (
          <FadeInSection delay={100}>
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.home.statsTitle}</Text>

              {/* Bento grid */}
              <View style={styles.bentoGrid}>
                <LinearGradient
                  colors={['#5A252C', '#722F37', '#8B3A42']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.bentoLarge}
                >
                  <Pressable onPress={() => router.push({ pathname: '/search', params: { onlySale: 'false', onlyOrganic: 'false' } })} style={styles.bentoLargeInner}>
                    <Ionicons name="wine" size={32} color="rgba(255,255,255,0.15)" style={styles.bentoIcon} />
                    <Text style={styles.bentoLargeNumber}>{stats.total.toLocaleString()}</Text>
                    <Text style={styles.bentoLargeLabel}>{t.home.winesAvailable}</Text>
                    <View style={styles.bentoExploreBtn}>
                      <Text style={styles.bentoExploreText}>{t.home.explore}</Text>
                      <Ionicons name="arrow-forward" size={14} color="#fff" />
                    </View>
                  </Pressable>
                </LinearGradient>

                <View style={styles.bentoStack}>
                  <Pressable
                    style={[styles.bentoSmall, { backgroundColor: colors.white }]}
                    onPress={() => router.push({ pathname: '/search', params: { onlySale: 'true', onlyOrganic: 'false' } })}
                  >
                    <View style={[styles.bentoDot, { backgroundColor: '#C0392B' }]} />
                    <Text style={[styles.bentoSmallNumber, { color: '#C0392B' }]}>{stats.onSale.toLocaleString()}</Text>
                    <Text style={[styles.bentoSmallLabel, { color: colors.gray }]}>{t.search.onSaleCount}</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.bentoSmall, { backgroundColor: colors.white }]}
                    onPress={() => router.push({ pathname: '/search', params: { onlyOrganic: 'true', onlySale: 'false' } })}
                  >
                    <View style={[styles.bentoDot, { backgroundColor: '#27AE60' }]} />
                    <Text style={[styles.bentoSmallNumber, { color: '#27AE60' }]}>{stats.organic.toLocaleString()}</Text>
                    <Text style={[styles.bentoSmallLabel, { color: colors.gray }]}>{t.search.organicCount}</Text>
                  </Pressable>
                </View>
              </View>

              {/* Top countries with flags */}
              <Text style={[styles.chipSectionTitle, { color: colors.black }]}>{t.search.topCountries}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {stats.topCountries.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.country}
                    onPress={() => router.push({ pathname: '/search', params: { query: c.country } })}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: colors.white, borderColor: colors.grayLight },
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text style={styles.chipFlag}>{COUNTRY_FLAGS[c.country] || '🍷'}</Text>
                    <Text style={[styles.chipText, { color: colors.black }]}>{tc(c.country)}</Text>
                    <Text style={[styles.chipCount, { color: colors.gray }]}>{c.count}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              {/* Top grapes */}
              <Text style={[styles.chipSectionTitle, { color: colors.black }]}>{t.search.topGrapes}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                {stats.topGrapes.slice(0, 8).map((g) => (
                  <Pressable
                    key={g.grape}
                    onPress={() => router.push({ pathname: '/search', params: { query: g.grape } })}
                    style={({ pressed }) => [
                      styles.chip,
                      { backgroundColor: colors.white, borderColor: colors.grayLight },
                      pressed && { transform: [{ scale: 0.96 }] },
                    ]}
                  >
                    <Text style={styles.chipFlag}>🍇</Text>
                    <Text style={[styles.chipText, { color: colors.black }]}>{g.grape}</Text>
                    <Text style={[styles.chipCount, { color: colors.gray }]}>{g.count}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </FadeInSection>
        )}

        <View style={{ height: SPACING.xl * 2 }} />
      </View>
    </ScrollView>
  );
}

/* ---- Animated wrappers ---- */

function AnimatedTile({ children, index }: { children: React.ReactNode; index: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: index * 80,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      flex: 1,
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                   { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

function FadeInSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 500,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: anim,
      transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
    }}>
      {children}
    </Animated.View>
  );
}

/* ---- Sub-components ---- */

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

/* ---- Styles ---- */

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Centered content wrapper for PWA/desktop
  contentWrap: {
    width: '100%',
    maxWidth: MAX_W,
    alignSelf: 'center',
  },

  // Hero
  hero: { paddingHorizontal: SPACING.md, paddingTop: SPACING.md, paddingBottom: SPACING.lg },
  greeting: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontWeight: '500', marginTop: 4 },

  // Quick actions 2x2
  actionsGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionTile: {
    flex: 1,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  actionTilePressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  actionGradient: {
    padding: SPACING.md,
    minHeight: 100,
    justifyContent: 'flex-end',
  },
  actionIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  actionLabel: { fontSize: 15, fontWeight: '700', color: '#fff' },
  actionSub: { fontSize: 11, fontWeight: '500', color: 'rgba(255,255,255,0.6)', marginTop: 2 },

  // Sections
  section: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: SPACING.md, letterSpacing: -0.3 },

  // Bento grid
  bentoGrid: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  bentoLarge: {
    flex: 1.2, borderRadius: RADIUS.lg, overflow: 'hidden',
  },
  bentoLargeInner: {
    padding: SPACING.md, justifyContent: 'flex-end', minHeight: 150,
  },
  bentoIcon: { position: 'absolute', top: SPACING.md, right: SPACING.md },
  bentoLargeNumber: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  bentoLargeLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  bentoExploreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: SPACING.sm, alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.full,
  },
  bentoExploreText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  bentoStack: { flex: 1, gap: SPACING.sm },
  bentoSmall: {
    flex: 1, borderRadius: RADIUS.lg, padding: SPACING.md,
    justifyContent: 'center', ...SHADOWS.card,
  },
  bentoDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 6 },
  bentoSmallNumber: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  bentoSmallLabel: { fontSize: 11, fontWeight: '600', marginTop: 2 },

  // Chips
  chipSectionTitle: { fontSize: 14, fontWeight: '700', marginTop: SPACING.sm, marginBottom: SPACING.sm },
  chipsRow: { gap: SPACING.sm, paddingRight: SPACING.md },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: RADIUS.full, borderWidth: 1,
  },
  chipFlag: { fontSize: 16 },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipCount: { fontSize: 11, fontWeight: '500', opacity: 0.7 },
});
