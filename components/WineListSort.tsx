import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/i18n';

export type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name' | 'rating';

interface Props {
  sortBy: SortKey;
  onSortChange: (sort: SortKey) => void;
  filterType?: string;
  onFilterChange?: (type: string | undefined) => void;
  showTypeFilter?: boolean;
  resultCount?: number;
}

const SORT_OPTIONS: { key: SortKey; icon: string }[] = [
  { key: 'price_asc', icon: 'arrow-up' },
  { key: 'price_desc', icon: 'arrow-down' },
  { key: 'name', icon: 'text' },
  { key: 'rating', icon: 'star' },
];

const WINE_TYPES = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];

export function sortWines<T extends { price: number; name: string; maxExpertScore?: number }>(
  wines: T[],
  sortBy: SortKey,
): T[] {
  if (sortBy === 'default') return wines;
  return [...wines].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'name': return a.name.localeCompare(b.name);
      case 'rating': {
        const aScore = a.maxExpertScore || 0;
        const bScore = b.maxExpertScore || 0;
        if (aScore >= 90 && bScore < 90) return -1;
        if (bScore >= 90 && aScore < 90) return 1;
        return bScore - aScore;
      }
      default: return 0;
    }
  });
}

export function filterByType<T extends { type: string }>(wines: T[], type?: string): T[] {
  if (!type) return wines;
  return wines.filter((w) => w.type === type);
}

export default function WineListSort({ sortBy, onSortChange, filterType, onFilterChange, showTypeFilter = true, resultCount }: Props) {
  const t = useTranslation();
  const colors = useThemeColors();

  const sortLabels: Record<SortKey, string> = {
    default: '-',
    price_asc: t.sort.priceAsc,
    price_desc: t.sort.priceDesc,
    name: t.sort.name,
    rating: t.sort.rating,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.white, borderBottomColor: colors.grayLight + '40' }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.gray }]}>{t.sort.sortBy}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORT_OPTIONS.map((opt) => {
            const active = sortBy === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => onSortChange(active ? 'default' : opt.key)}
                style={[styles.chip, { backgroundColor: colors.cream }, active && { backgroundColor: colors.burgundy }]}
              >
                <Ionicons name={opt.icon as any} size={12} color={active ? COLORS.white : colors.grayDark} />
                <Text style={[styles.chipText, { color: colors.grayDark }, active && { color: COLORS.white }]}>
                  {sortLabels[opt.key]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {resultCount !== undefined && (
          <Text style={[styles.count, { color: colors.gray }]}>{resultCount}</Text>
        )}
      </View>

      {showTypeFilter && onFilterChange && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChips}>
          <Pressable
            onPress={() => onFilterChange(undefined)}
            style={[styles.typeChip, { borderColor: colors.grayLight }, !filterType && { backgroundColor: colors.burgundy, borderColor: colors.burgundy }]}
          >
            <Text style={[styles.typeChipText, { color: colors.grayDark }, !filterType && { color: COLORS.white }]}>{t.sort.all}</Text>
          </Pressable>
          {WINE_TYPES.map((type) => {
            const active = filterType === type;
            return (
              <Pressable
                key={type}
                onPress={() => onFilterChange(active ? undefined : type)}
                style={[styles.typeChip, { borderColor: colors.grayLight }, active && { backgroundColor: colors.burgundy, borderColor: colors.burgundy }]}
              >
                <Text style={[styles.typeChipText, { color: colors.grayDark }, active && { color: COLORS.white }]}>{t.wineTypes[type] || type}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: SPACING.sm,
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
  typeChips: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xs,
  },
  typeChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
