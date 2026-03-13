import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { saqApi } from '@/services/api';
import { apiCache } from '@/services/apiCache';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { hapticSelection } from '@/services/haptics';
import VipBanner from '@/components/VipBanner';
import WineCard from '@/components/WineCard';
import DealsSkeleton from '@/components/DealsSkeleton';
import EmptyState from '@/components/EmptyState';

const BUDGETS = [15, 20, 25, 30, 50] as const;
const BUDGET_KEY = 'deals_budget';

export default function DealsScreen() {
  const t = useTranslation();
  const colors = useThemeColors();
  const router = useRouter();
  const { vipMode } = useSettings();
  const [budget, setBudget] = useState<number>(25);
  const [coeurs, setCoeurs] = useState<Wine[]>([]);
  const [deals, setDeals] = useState<Wine[]>([]);
  const [promos, setPromos] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialLoaded = useRef(false);

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Get the price floor for a budget (previous tier)
  const getFloor = (b: number) => {
    const idx = BUDGETS.indexOf(b as typeof BUDGETS[number]);
    return idx > 0 ? BUDGETS[idx - 1] : 0;
  };

  // Filter wines to only include those within the price bracket (floor, budget]
  const filterToBracket = (wines: Wine[], b: number): Wine[] => {
    const floor = getFloor(b);
    return wines.filter(w => w.price > floor && w.price <= b);
  };

  // Merge sweet-spot wines with deals: sweet-spot first, then remaining deals (deduped)
  const mergeDeals = (sweetSpot: Wine[], rawDeals: Wine[], b: number): Wine[] => {
    const filtered = filterToBracket([...sweetSpot, ...rawDeals], b);
    const seen = new Set<string>();
    return filtered.filter(w => { if (seen.has(w.id)) return false; seen.add(w.id); return true; }).slice(0, 10);
  };

  // Fetch ONLY deals for a given budget (used on budget change)
  const fetchDealsOnly = useCallback(async (b: number) => {
    // Check cache first — re-filter to bracket in case of stale data
    const cached = apiCache.getDeals(b, vipMode || undefined);
    if (cached) {
      setDeals(filterToBracket(cached, b));
      return;
    }

    setDealsLoading(true);
    try {
      const floor = getFloor(b);
      const [dealsRes, sweetRes] = await Promise.all([
        saqApi.deals({ budget: b, limit: 10, vip: vipMode || undefined }),
        floor > 0
          ? saqApi.search({ minPrice: floor, maxPrice: b, limit: 5, vip: vipMode || undefined })
          : Promise.resolve({ wines: [] as Wine[] } as any),
      ]);
      const merged = mergeDeals(sweetRes.wines || [], dealsRes.wines, b);
      apiCache.setDeals(b, vipMode || undefined, merged);
      setDeals(merged);
    } catch (err) {
      console.warn('Failed to fetch deals for budget', b, err);
    } finally {
      setDealsLoading(false);
    }
  }, [vipMode]);

  // Fetch coeurs (independent of VIP — coups de coeur don't change)
  const coeursLoaded = useRef(false);
  const fetchCoeurs = useCallback(async () => {
    if (coeursLoaded.current) return;
    try {
      const coeurRes = await saqApi.coeur({ limit: 30 });
      setCoeurs(shuffle(coeurRes.wines).slice(0, 10));
      coeursLoaded.current = true;
    } catch {}
  }, []);

  // Full initial load (all sections)
  const doFetch = useCallback(async (b: number, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const floor = getFloor(b);

      // Fetch coeurs only once (VIP-independent)
      const coeurPromise = coeursLoaded.current
        ? Promise.resolve()
        : fetchCoeurs();

      const [, dealsRes, sweetRes, promoRes] = await Promise.all([
        coeurPromise,
        saqApi.deals({ budget: b, limit: 10, vip: vipMode || undefined }),
        floor > 0
          ? saqApi.search({ minPrice: floor, maxPrice: b, limit: 5, vip: vipMode || undefined })
          : Promise.resolve({ wines: [] as Wine[] } as any),
        saqApi.search({ onlySale: true, limit: 10, vip: vipMode || undefined }),
      ]);

      const merged = mergeDeals(sweetRes.wines || [], dealsRes.wines, b);
      apiCache.setDeals(b, vipMode || undefined, merged);
      setDeals(merged);
      setPromos(promoRes.wines);
      initialLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, vipMode, fetchCoeurs]);

  // Budget change: update state + fetch only deals section
  const handleBudgetChange = useCallback((b: number) => {
    hapticSelection();
    setBudget(b);
    AsyncStorage.setItem(BUDGET_KEY, String(b)).catch(() => {});
    fetchDealsOnly(b);
  }, [fetchDealsOnly]);

  // Load persisted budget then initial fetch
  useEffect(() => {
    AsyncStorage.getItem(BUDGET_KEY).then((val) => {
      const b = val ? Number(val) : 25;
      setBudget(b);
      doFetch(b);
    }).catch(() => {
      doFetch(25);
    });
  }, [doFetch]);

  // Re-fetch when VIP mode changes
  useEffect(() => {
    if (initialLoaded.current) {
      doFetch(budget, true);
    }
  }, [vipMode]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await doFetch(budget, true);
  }, [doFetch, budget]);

  // Only show full-screen skeleton on first load
  if (loading && !initialLoaded.current) return <DealsSkeleton />;
  if (error && !initialLoaded.current) return <EmptyState icon="cloud-offline-outline" message={t.deals.error} submessage={error} onRetry={() => doFetch(budget)} />;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.cream }]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.burgundy}
          colors={[colors.burgundy]}
        />
      }
    >
      {/* VIP banner */}
      {vipMode && (
        <View style={{ marginTop: SPACING.md }}>
          <VipBanner />
        </View>
      )}

      {/* Coups de Cœur */}
      {coeurs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.deals.coupDeCoeur}</Text>
            <Pressable onPress={() => router.push('/coups-de-coeur')} hitSlop={12}>
              <Text style={[styles.seeAll, { color: colors.burgundy }]}>{t.deals.seeAll} ›</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={coeurs}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WineCard wine={item} compact />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      {/* Budget selector + Top Deals */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone, { color: colors.black }]}>{t.deals.topDeals} {budget}$</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetRow}>
          {BUDGETS.map((b) => {
            const active = budget === b;
            return (
              <Pressable key={b} onPress={() => handleBudgetChange(b)} style={[styles.budgetBtn, { backgroundColor: colors.white, borderColor: colors.grayLight }, active && { backgroundColor: colors.burgundy, borderColor: colors.burgundy }]} accessibilityLabel={`Budget ${b}$`} accessibilityRole="button" accessibilityState={{ selected: active }}>
                <Text style={[styles.budgetText, { color: colors.grayDark }, active && { color: '#FFFFFF' }]}>{b}$</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {dealsLoading ? (
          <Text style={[styles.emptyText, { color: colors.gray }]}>{t.deals.loading}</Text>
        ) : deals.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.gray }]}>{t.deals.noDeal}</Text>
        ) : (
          deals.map((wine) => <WineCard key={wine.id} wine={wine} />)
        )}
      </View>

      {/* En promo */}
      {promos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.deals.onSale}</Text>
            <Pressable onPress={() => router.push('/en-promo')} hitSlop={12}>
              <Text style={[styles.seeAll, { color: colors.burgundy }]}>{t.deals.seeAll} ›</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={promos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WineCard wine={item} compact />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  budgetRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  budgetBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginRight: SPACING.sm,
  },
  budgetText: { fontSize: 16, fontWeight: '600' },
  section: { marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 20, fontWeight: '800' },
  seeAll: { fontSize: 14, fontWeight: '600' },
  sectionTitleStandalone: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  horizontalList: { paddingHorizontal: SPACING.md },
  emptyText: { paddingHorizontal: SPACING.md, fontStyle: 'italic' },
});
