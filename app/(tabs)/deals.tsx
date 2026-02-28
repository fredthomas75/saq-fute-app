import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

const BUDGETS = [15, 20, 25, 30, 50];

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

  const shuffle = <T,>(arr: T[]): T[] => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [coeurRes, dealsRes, promoRes] = await Promise.all([
        saqApi.coeur({ limit: 30 }),
        saqApi.deals({ budget, limit: 10 }),
        saqApi.search({ onlySale: true, limit: 10 }),
      ]);
      setCoeurs(shuffle(coeurRes.wines).slice(0, 10));
      setDeals(dealsRes.wines);
      setPromos(promoRes.wines);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  }, [budget, t]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  if (loading) return <LoadingState message={t.deals.loading} />;
  if (error) return <EmptyState icon="cloud-offline-outline" message={t.deals.error} submessage={error} onRetry={fetchAll} />;

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); }}
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
            <Pressable key={b} onPress={() => setBudget(b)} style={[styles.budgetBtn, budget === b && styles.budgetBtnActive]}>
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
          <Text style={[styles.sectionTitle, styles.sectionTitleStandalone]}>{t.deals.onSale}</Text>
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
