import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import DealsSkeleton from '@/components/DealsSkeleton';
import EmptyState from '@/components/EmptyState';

const BUDGETS = [15, 20, 25, 30, 50] as const;
const BUDGET_KEY = 'deals_budget';
const CACHE_KEY = 'deals_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheData {
  coeurs: Wine[];
  deals: Wine[];
  sweetSpot: Wine[];
  promos: Wine[];
  budget: number;
  timestamp: number;
}

export default function DealsScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [budget, setBudget] = useState<number>(25);
  const [coeurs, setCoeurs] = useState<Wine[]>([]);
  const [deals, setDeals] = useState<Wine[]>([]);
  const [promos, setPromos] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasData = useRef(false);

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

  // Merge sweet-spot wines with deals: sweet-spot first, then remaining deals (deduped)
  const mergeDeals = (sweetSpot: Wine[], deals: Wine[]): Wine[] => {
    const seen = new Set(sweetSpot.map(w => w.id));
    const rest = deals.filter(w => !seen.has(w.id));
    return [...sweetSpot, ...rest].slice(0, 10);
  };

  // Persist budget when changed
  const handleBudgetChange = useCallback((b: number) => {
    setBudget(b);
    hasData.current = false;
    AsyncStorage.setItem(BUDGET_KEY, String(b)).catch(() => {});
  }, []);

  const doFetch = useCallback(async (b: number, isRefresh = false) => {
    if (!isRefresh && hasData.current) return;
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      // Try cache first (not on refresh)
      if (!isRefresh) {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const data: CacheData = JSON.parse(cached);
          if (Date.now() - data.timestamp < CACHE_TTL && data.budget === b) {
            setCoeurs(shuffle(data.coeurs).slice(0, 10));
            setDeals(mergeDeals(data.sweetSpot || [], data.deals));
            setPromos(data.promos);
            hasData.current = true;
            setLoading(false);
            return;
          }
        }
      }

      const floor = getFloor(b);
      const [coeurRes, dealsRes, sweetRes, promoRes] = await Promise.all([
        saqApi.coeur({ limit: 30 }),
        saqApi.deals({ budget: b, limit: 10 }),
        // Fetch wines in the sweet-spot range (e.g. 20-25$ for budget 25$)
        floor > 0
          ? saqApi.search({ minPrice: floor, maxPrice: b, limit: 5 })
          : Promise.resolve({ wines: [] as Wine[] } as any),
        saqApi.search({ onlySale: true, limit: 10 }),
      ]);

      setCoeurs(shuffle(coeurRes.wines).slice(0, 10));
      setDeals(mergeDeals(sweetRes.wines || [], dealsRes.wines));
      setPromos(promoRes.wines);
      hasData.current = true;

      // Save to cache
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        coeurs: coeurRes.wines,
        deals: dealsRes.wines,
        sweetSpot: sweetRes.wines || [],
        promos: promoRes.wines,
        budget: b,
        timestamp: Date.now(),
      } as CacheData)).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Load persisted budget then fetch
  useEffect(() => {
    AsyncStorage.getItem(BUDGET_KEY).then((val) => {
      const b = val ? Number(val) : 25;
      setBudget(b);
      doFetch(b);
    }).catch(() => {
      doFetch(25);
    });
  }, [doFetch]);

  // Refetch when budget changes via user tap
  useEffect(() => {
    if (!hasData.current) return; // Skip initial mount
    doFetch(budget);
  }, [budget, doFetch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    hasData.current = false;
    await doFetch(budget, true);
  }, [doFetch, budget]);

  // Only show full-screen skeleton on first load (no data yet)
  if (loading && !hasData.current) return <DealsSkeleton />;
  if (error && !hasData.current) return <EmptyState icon="cloud-offline-outline" message={t.deals.error} submessage={error} onRetry={() => { hasData.current = false; doFetch(budget); }} />;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={COLORS.burgundy}
          colors={[COLORS.burgundy]}
        />
      }
    >
      {/* Coups de Cœur */}
      {coeurs.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.deals.coupDeCoeur}</Text>
            <Pressable onPress={() => router.push('/coups-de-coeur')} hitSlop={12}>
              <Text style={styles.seeAll}>{t.deals.seeAll} ›</Text>
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
        <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{t.deals.topDeals} {budget}$</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.budgetRow}>
          {BUDGETS.map((b) => (
            <Pressable key={b} onPress={() => handleBudgetChange(b)} style={[styles.budgetBtn, budget === b && styles.budgetBtnActive]}>
              <Text style={[styles.budgetText, budget === b && styles.budgetTextActive]}>{b}$</Text>
            </Pressable>
          ))}
        </ScrollView>
        {deals.length === 0 ? (
          <Text style={styles.emptyText}>{t.deals.noDeal}</Text>
        ) : (
          deals.map((wine) => <WineCard key={wine.id} wine={wine} />)
        )}
      </View>

      {/* En promo */}
      {promos.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t.deals.onSale}</Text>
            <Pressable onPress={() => router.push('/en-promo')} hitSlop={12}>
              <Text style={styles.seeAll}>{t.deals.seeAll} ›</Text>
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
  container: { flex: 1, backgroundColor: COLORS.cream },
  budgetRow: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  budgetBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    marginRight: SPACING.sm,
  },
  budgetBtnActive: { backgroundColor: COLORS.burgundy, borderColor: COLORS.burgundy },
  budgetText: { fontSize: 16, fontWeight: '600', color: COLORS.grayDark },
  budgetTextActive: { color: COLORS.white },
  section: { marginTop: SPACING.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.black },
  seeAll: { fontSize: 14, fontWeight: '600', color: COLORS.burgundy },
  sectionTitleStandalone: { paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  horizontalList: { paddingHorizontal: SPACING.md },
  emptyText: { color: COLORS.gray, paddingHorizontal: SPACING.md, fontStyle: 'italic' },
});
