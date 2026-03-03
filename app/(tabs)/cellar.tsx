import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, FlatList, Pressable, TextInput, RefreshControl, Platform, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { TYPE_COLORS } from '@/constants/wine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useCellar, CellarWine } from '@/context/CellarContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation, useTranslateCountry } from '@/i18n';
import EmptyState from '@/components/EmptyState';
import WineListSort, { SortKey } from '@/components/WineListSort';

function CellarItem({ wine }: { wine: CellarWine }) {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const { updateQuantity, updateNotes, removeFromCellar } = useCellar();
  const [showNotes, setShowNotes] = useState(false);

  return (
    <View style={[styles.card, { backgroundColor: colors.white }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[wine.type] || colors.gray }]} />
        <Text style={[styles.wineName, { color: colors.black }]} numberOfLines={2}>{wine.name}</Text>
        <Pressable onPress={() => removeFromCellar(wine.wineId)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={COLORS.red} />
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: colors.gray }]}>{tc(wine.country)}</Text>
        <Text style={[styles.metaText, { color: colors.gray }]}>{wine.price.toFixed(2)}$</Text>
      </View>

      <View style={[styles.qtyRow, { borderTopColor: colors.grayLight + '40' }]}>
        <Text style={[styles.qtyLabel, { color: colors.gray }]}>{t.cellar.quantity}</Text>
        <View style={styles.qtyControls}>
          <Pressable onPress={() => updateQuantity(wine.wineId, wine.quantity - 1)} style={[styles.qtyBtn, { backgroundColor: colors.cream }]}>
            <Ionicons name="remove" size={18} color={colors.burgundy} />
          </Pressable>
          <Text style={[styles.qtyValue, { color: colors.black }]}>{wine.quantity}</Text>
          <Pressable onPress={() => updateQuantity(wine.wineId, wine.quantity + 1)} style={[styles.qtyBtn, { backgroundColor: colors.cream }]}>
            <Ionicons name="add" size={18} color={colors.burgundy} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setShowNotes(!showNotes)} style={styles.notesToggle}>
        <Ionicons name="create-outline" size={14} color={colors.gray} />
        <Text style={[styles.notesToggleText, { color: colors.gray }]}>{t.cellar.notes}</Text>
      </Pressable>

      {showNotes && (
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.cream, color: colors.black }]}
          value={wine.notes || ''}
          onChangeText={(text) => updateNotes(wine.wineId, text)}
          placeholder={t.cellar.notesPlaceholder}
          placeholderTextColor={colors.grayLight}
          multiline
        />
      )}
    </View>
  );
}

function sortCellar(wines: CellarWine[], sortBy: SortKey): CellarWine[] {
  if (sortBy === 'default') return wines;
  return [...wines].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });
}

export default function CellarScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const { cellar, totalBottles, totalValue } = useCellar();
  const { syncNow, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();
  const [refreshing, setRefreshing] = useState(false);
  const [showStats, setShowStats] = useState(false);

  const onRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    try { await syncNow(); } catch {}
    setRefreshing(false);
  }, [syncNow, isAuthenticated]);

  // --- Stats data ---
  const stats = useMemo(() => {
    const byType: Record<string, { count: number; value: number }> = {};
    const byCountry: Record<string, { count: number; value: number }> = {};
    cellar.forEach((w) => {
      const t = w.type || 'Autre';
      const c = w.country || 'Autre';
      if (!byType[t]) byType[t] = { count: 0, value: 0 };
      byType[t].count += w.quantity;
      byType[t].value += w.price * w.quantity;
      if (!byCountry[c]) byCountry[c] = { count: 0, value: 0 };
      byCountry[c].count += w.quantity;
      byCountry[c].value += w.price * w.quantity;
    });
    const topCountries = Object.entries(byCountry)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
    const avgPrice = totalBottles > 0 ? totalValue / totalBottles : 0;
    return { byType, topCountries, avgPrice };
  }, [cellar, totalBottles, totalValue]);

  // --- Export CSV ---
  const handleExport = useCallback(async () => {
    const header = 'Nom,Type,Pays,Prix,Quantité,Valeur,Notes';
    const rows = cellar.map((w) =>
      `"${w.name.replace(/"/g, '""')}",${w.type},${w.country},${w.price.toFixed(2)},${w.quantity},${(w.price * w.quantity).toFixed(2)},"${(w.notes || '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');

    if (Platform.OS === 'web') {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cave-saq-fute-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('📁 ' + t.cellar.export + ' CSV ✓');
    } else {
      try {
        await Share.share({ message: csv, title: 'Ma cave SAQ Futé' });
        showToast('📁 ' + t.cellar.export + ' CSV ✓');
      } catch {}
    }
  }, [cellar, showToast, t]);

  const displayedWines = useMemo(() => {
    let list = filterType ? cellar.filter((w) => w.type === filterType) : cellar;
    return sortCellar(list, sortBy);
  }, [cellar, sortBy, filterType]);

  if (cellar.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.cream }]}>
        <EmptyState icon="wine-outline" message={t.cellar.empty} submessage={t.cellar.emptySub} />
      </View>
    );
  }

  const ListHeader = (
    <>
      {/* Stats bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.white }]}>
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.burgundy }]}>{totalBottles}</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>{t.cellar.bottles}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.grayLight }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.burgundy }]}>{totalValue.toFixed(0)}$</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>{t.cellar.totalValue}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.grayLight }]} />
        <View style={styles.stat}>
          <Text style={[styles.statValue, { color: colors.burgundy }]}>{stats.avgPrice.toFixed(0)}$</Text>
          <Text style={[styles.statLabel, { color: colors.gray }]}>{t.cellar.avgPrice}</Text>
        </View>
      </View>

      {/* Stats toggle + action buttons */}
      <View style={styles.actionRow}>
        <Pressable onPress={() => setShowStats(!showStats)} style={[styles.actionChip, { backgroundColor: colors.white, borderColor: colors.grayLight }, showStats && { backgroundColor: colors.burgundy, borderColor: colors.burgundy }]}>
          <Ionicons name="stats-chart-outline" size={16} color={showStats ? '#FFFFFF' : colors.burgundy} />
          <Text style={[styles.actionChipText, { color: colors.burgundy }, showStats && { color: '#FFFFFF' }]}>{t.cellar.statistics}</Text>
        </Pressable>
        <Pressable onPress={handleExport} style={[styles.actionChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
          <Ionicons name="download-outline" size={16} color={colors.burgundy} />
          <Text style={[styles.actionChipText, { color: colors.burgundy }]}>{t.cellar.export}</Text>
        </Pressable>
      </View>

      {/* Stats dashboard */}
      {showStats && (
        <View style={[styles.statsCard, { backgroundColor: colors.white }]}>
          <Text style={[styles.statsSubtitle, { color: colors.gray }]}>{t.cellar.byType}</Text>
          {Object.entries(stats.byType).map(([type, data]) => (
            <View key={type} style={styles.barRow}>
              <View style={[styles.barDot, { backgroundColor: TYPE_COLORS[type] || colors.gray }]} />
              <Text style={[styles.barLabel, { color: colors.black }]}>{t.wineTypes[type] || type}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.grayLight + '40' }]}>
                <View style={[styles.barFill, { width: `${(data.count / totalBottles) * 100}%`, backgroundColor: TYPE_COLORS[type] || colors.gray }]} />
              </View>
              <Text style={[styles.barValue, { color: colors.black }]}>{data.count}</Text>
            </View>
          ))}
          <Text style={[styles.statsSubtitle, { color: colors.gray, marginTop: SPACING.md }]}>{t.cellar.byCountry}</Text>
          {stats.topCountries.map(([country, data]) => (
            <View key={country} style={styles.barRow}>
              <Text style={[styles.barLabel, { color: colors.black }]}>{tc(country)}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.grayLight + '40' }]}>
                <View style={[styles.barFill, { width: `${(data.count / totalBottles) * 100}%`, backgroundColor: colors.burgundy }]} />
              </View>
              <Text style={[styles.barValue, { color: colors.black }]}>{data.count}</Text>
            </View>
          ))}
        </View>
      )}

      <WineListSort
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterType={filterType}
        onFilterChange={setFilterType}
      />
    </>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <FlatList
        data={displayedWines}
        keyExtractor={(item) => item.wineId}
        renderItem={({ item }) => <CellarItem wine={item} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.burgundy} colors={[colors.burgundy]} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  statsBar: {
    flexDirection: 'row',
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900' },
  statLabel: { fontSize: 12, marginTop: 2 },
  statDivider: { width: 1 },
  list: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  wineName: { flex: 1, fontSize: 15, fontWeight: '700' },
  meta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs, marginLeft: 18 },
  metaText: { fontSize: 13 },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
  },
  qtyLabel: { fontSize: 13 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '700', minWidth: 24, textAlign: 'center' },
  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  notesToggleText: { fontSize: 12 },
  notesInput: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  actionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
  },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  actionChipText: { fontSize: 13, fontWeight: '600' },
  statsCard: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  statsSubtitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 6,
  },
  barDot: { width: 8, height: 8, borderRadius: 4 },
  barLabel: { fontSize: 13, width: 70 },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
  barValue: { fontSize: 13, fontWeight: '700', width: 28, textAlign: 'right' },
});
