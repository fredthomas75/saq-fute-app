import React from 'react';
import { View, ScrollView, Pressable, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name' | 'deal' | 'rating';

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
  { key: 'deal', icon: 'flame' },
  { key: 'rating', icon: 'star' },
];

const WINE_TYPES = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];

export function sortWines<T extends { price: number; name: string; dealScore?: number; maxExpertScore?: number }>(
  wines: T[],
  sortBy: SortKey,
): T[] {
  if (sortBy === 'default') return wines;
  return [...wines].sort((a, b) => {
    switch (sortBy) {
      case 'price_asc': return a.price - b.price;
      case 'price_desc': return b.price - a.price;
      case 'name': return a.name.localeCompare(b.name);
      case 'deal': return (b.dealScore || 0) - (a.dealScore || 0);
      case 'rating': {
        const aScore = a.maxExpertScore || 0;
        const bScore = b.maxExpertScore || 0;
        // Wines with actual expert scores (90+) first, then by score desc
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

  const sortLabels: Record<SortKey, string> = {
    default: '-',
    price_asc: t.sort.priceAsc,
    price_desc: t.sort.priceDesc,
    name: t.sort.name,
    deal: t.sort.bestDeal,
    rating: t.sort.rating,
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>{t.sort.sortBy}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {SORT_OPTIONS.map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => onSortChange(sortBy === opt.key ? 'default' : opt.key)}
              style={[styles.chip, sortBy === opt.key && styles.chipActive]}
            >
              <Ionicons name={opt.icon as any} size={12} color={sortBy === opt.key ? COLORS.white : COLORS.grayDark} />
              <Text style={[styles.chipText, sortBy === opt.key && styles.chipTextActive]}>
                {sortLabels[opt.key]}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        {resultCount !== undefined && (
          <Text style={styles.count}>{resultCount}</Text>
        )}
      </View>

      {showTypeFilter && onFilterChange && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.typeChips}>
          <Pressable
            onPress={() => onFilterChange(undefined)}
            style={[styles.typeChip, !filterType && styles.typeChipActive]}
          >
            <Text style={[styles.typeChipText, !filterType && styles.typeChipTextActive]}>{t.sort.all}</Text>
          </Pressable>
          {WINE_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => onFilterChange(filterType === type ? undefined : type)}
              style={[styles.typeChip, filterType === type && styles.typeChipActive]}
            >
              <Text style={[styles.typeChipText, filterType === type && styles.typeChipTextActive]}>{type}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    paddingVertical: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grayLight + '40',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.gray,
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
    backgroundColor: COLORS.cream,
  },
  chipActive: {
    backgroundColor: COLORS.burgundy,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  chipTextActive: {
    color: COLORS.white,
  },
  count: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gray,
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
    borderColor: COLORS.grayLight,
  },
  typeChipActive: {
    backgroundColor: COLORS.burgundy,
    borderColor: COLORS.burgundy,
  },
  typeChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  typeChipTextActive: {
    color: COLORS.white,
  },
});
