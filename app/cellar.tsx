import React, { useState, useMemo } from 'react';
import { View, Text, FlatList, Pressable, TextInput, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useCellar, CellarWine } from '@/context/CellarContext';
import { useTranslation } from '@/i18n';
import EmptyState from '@/components/EmptyState';
import WineListSort, { SortKey } from '@/components/WineListSort';

const TYPE_COLORS: Record<string, string> = {
  Rouge: '#722F37',
  Blanc: '#C5A572',
  Rosé: '#E8A0BF',
  Mousseux: '#7FB3D8',
};

function CellarItem({ wine }: { wine: CellarWine }) {
  const t = useTranslation();
  const { updateQuantity, updateNotes, removeFromCellar } = useCellar();
  const [showNotes, setShowNotes] = useState(false);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[wine.type] || COLORS.gray }]} />
        <Text style={styles.wineName} numberOfLines={2}>{wine.name}</Text>
        <Pressable onPress={() => removeFromCellar(wine.wineId)} hitSlop={8}>
          <Ionicons name="trash-outline" size={18} color={COLORS.red} />
        </Pressable>
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaText}>{wine.country}</Text>
        <Text style={styles.metaText}>{wine.price.toFixed(2)}$</Text>
      </View>

      <View style={styles.qtyRow}>
        <Text style={styles.qtyLabel}>{t.cellar.quantity}</Text>
        <View style={styles.qtyControls}>
          <Pressable onPress={() => updateQuantity(wine.wineId, wine.quantity - 1)} style={styles.qtyBtn}>
            <Ionicons name="remove" size={18} color={COLORS.burgundy} />
          </Pressable>
          <Text style={styles.qtyValue}>{wine.quantity}</Text>
          <Pressable onPress={() => updateQuantity(wine.wineId, wine.quantity + 1)} style={styles.qtyBtn}>
            <Ionicons name="add" size={18} color={COLORS.burgundy} />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={() => setShowNotes(!showNotes)} style={styles.notesToggle}>
        <Ionicons name="create-outline" size={14} color={COLORS.gray} />
        <Text style={styles.notesToggleText}>{t.cellar.notes}</Text>
      </Pressable>

      {showNotes && (
        <TextInput
          style={styles.notesInput}
          value={wine.notes || ''}
          onChangeText={(text) => updateNotes(wine.wineId, text)}
          placeholder={t.cellar.notesPlaceholder}
          placeholderTextColor={COLORS.grayLight}
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
  const { cellar, totalBottles, totalValue, clearCellar } = useCellar();
  const [sortBy, setSortBy] = useState<SortKey>('default');
  const [filterType, setFilterType] = useState<string | undefined>();

  const displayedWines = useMemo(() => {
    let list = filterType ? cellar.filter((w) => w.type === filterType) : cellar;
    return sortCellar(list, sortBy);
  }, [cellar, sortBy, filterType]);

  const handleClear = () => {
    Alert.alert(t.cellar.clearCellarConfirm, t.cellar.clearCellarConfirmMsg, [
      { text: t.settings.cancel, style: 'cancel' },
      { text: t.settings.confirm, style: 'destructive', onPress: clearCellar },
    ]);
  };

  if (cellar.length === 0) {
    return (
      <View style={styles.container}>
        <EmptyState icon="wine-outline" message={t.cellar.empty} submessage={t.cellar.emptySub} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalBottles}</Text>
          <Text style={styles.statLabel}>{t.cellar.bottles}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{totalValue.toFixed(0)}$</Text>
          <Text style={styles.statLabel}>{t.cellar.totalValue}</Text>
        </View>
      </View>

      <WineListSort
        sortBy={sortBy}
        onSortChange={setSortBy}
        filterType={filterType}
        onFilterChange={setFilterType}
        resultCount={displayedWines.length}
      />

      <FlatList
        data={displayedWines}
        keyExtractor={(item) => item.wineId}
        renderItem={({ item }) => <CellarItem wine={item} />}
        contentContainerStyle={styles.list}
      />

      <Pressable onPress={handleClear} style={styles.clearBtn}>
        <Ionicons name="trash-outline" size={16} color={COLORS.red} />
        <Text style={styles.clearText}>{t.cellar.clearCellar}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '900', color: COLORS.burgundy },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.grayLight },
  list: { padding: SPACING.md, paddingBottom: SPACING.xl },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typeDot: { width: 10, height: 10, borderRadius: 5 },
  wineName: { flex: 1, fontSize: 15, fontWeight: '700', color: COLORS.black },
  meta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs, marginLeft: 18 },
  metaText: { fontSize: 13, color: COLORS.gray },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight + '40',
  },
  qtyLabel: { fontSize: 13, color: COLORS.gray },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: { fontSize: 18, fontWeight: '700', color: COLORS.black, minWidth: 24, textAlign: 'center' },
  notesToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: SPACING.sm },
  notesToggleText: { fontSize: 12, color: COLORS.gray },
  notesInput: {
    marginTop: SPACING.xs,
    padding: SPACING.sm,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm,
    fontSize: 14,
    color: COLORS.black,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
  },
  clearText: { fontSize: 14, color: COLORS.red },
});
