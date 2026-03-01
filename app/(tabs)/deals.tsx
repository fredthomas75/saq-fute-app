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

  // Merge sweet-spot wines with deals: sweet-spot first, then remaining deals (deduped)
  const mergeDeals = (sweetSpot: Wine[], rawDeals: Wine[]): Wine[] => {
    const seen = new Set(sweetSpot.map(w => w.id));
    const rest = rawDeals.filter(w => !seen.has(w.id));
    return [...sweetSpot, ...rest].slice(0, 10);
  };

  // Fetch ONLY deals for a given budget (used on budget change)
  const fetchDealsOnly = useCallback(async (b: number) => {
    setDealsLoading(true);
    try {
      const floor = getFloor(b);
      const [dealsRes, sweetRes] = await Promise.all([
        saqApi.deals({ budget: b, limit: 10 }),
        floor > 0
          ? saqApi.search({ minPrice: floor, maxPrice: b, limit: 5 })
          : Promise.resolve({ wines: [] as Wine[] } as any),
      ]);
      setDeals(mergeDeals(sweetRes.wines || [], dealsRes.wines));
    } catch (err) {
      // Keep existing deals on error, just log
      console.warn('Failed to fetch deals for budget', b, err);
    } finally {
      setDealsLoading(false);
    }
  }, []);

  // Full initial load (all sections)
  const doFetch = useCallback(async (b: number, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const floor = getFloor(b);
      const [coeurRes, dealsRes, sweetRes, promoRes] = await Promise.all([
        saqApi.coeur({ limit: 30 }),
        saqApi.deals({ budget: b, limit: 10 }),
        floor > 0
          ? saqApi.search({ minPrice: floor, maxPrice: b, limit: 5 })
          : Promise.resolve({ wines: [] as Wine[] } as any),
        saqApi.search({ onlySale: true, limit: 10 }),
      ]);

      setCoeurs(shuffle(coeurRes.wines).slice(0, 10));
      setDeals(mergeDeals(sweetRes.wines || [], dealsRes.wines));
      setPromos(promoRes.wines);
      initialLoaded.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  // Budget change: update state + fetch only deals section
  const handleBudgetChange = useCallback((b: number) => {
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

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await doFetch(budget, true);
  }, [doFetch, budget]);

  // Only show full-screen skeleton on first load
  if (loading && !initialLoaded.current) return <DealsSkeleton />;
  if (error && !initialLoaded.current) return <EmptyState icon="cloud-offline-outline" message={t.deals.error} submessage={error} onRetry={() => doFetch(budget)} />;

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
        {dealsLoading ? (
          <Text style={styles.emptyText}>{t.deals.loading}</Text>
        ) : deals.length === 0 ? (
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
