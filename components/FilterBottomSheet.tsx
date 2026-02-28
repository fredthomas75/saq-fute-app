import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Modal, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useTranslation } from '@/i18n';

const WINE_TYPE_KEYS = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];
const TYPE_COLORS: Record<string, string> = {
  Rouge: '#722F37',
  Blanc: '#C5A572',
  Rosé: '#E8A0BF',
  Mousseux: '#7FB3D8',
};

export interface FilterState {
  type?: string;
  onlySale: boolean;
  onlyOrganic: boolean;
  onlyExpert: boolean;
  priceMin?: number;
  priceMax?: number;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  initialFilters: FilterState;
}

export default function FilterBottomSheet({ visible, onClose, onApply, initialFilters }: Props) {
  const t = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, screenHeight, slideAnim, initialFilters]);

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    const empty: FilterState = { onlySale: false, onlyOrganic: false, onlyExpert: false };
    setFilters(empty);
    onApply(empty);
    onClose();
  };

  const activeCount = [
    filters.type,
    filters.onlySale,
    filters.onlyOrganic,
    filters.onlyExpert,
    filters.priceMin,
    filters.priceMax,
  ].filter(Boolean).length;

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t.filters.title}</Text>
          {activeCount > 0 && (
            <Pressable onPress={handleReset} hitSlop={8}>
              <Text style={styles.resetText}>{t.filters.reset}</Text>
            </Pressable>
          )}
        </View>

        {/* Wine type */}
        <Text style={styles.sectionLabel}>{t.filters.type}</Text>
        <View style={styles.typeRow}>
          {WINE_TYPE_KEYS.map((type) => {
            const isActive = filters.type === type;
            const label = t.wineTypes[type] || type;
            return (
              <Pressable
                key={type}
                onPress={() => setFilters((f) => ({ ...f, type: f.type === type ? undefined : type }))}
                style={[styles.typeChip, isActive && { backgroundColor: TYPE_COLORS[type], borderColor: TYPE_COLORS[type] }]}
              >
                <Text style={[styles.typeChipText, isActive && { color: COLORS.white }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Price range */}
        <Text style={styles.sectionLabel}>{t.filters.priceRange}</Text>
        <View style={styles.priceRow}>
          <TextInput
            style={styles.priceInput}
            placeholder={t.filters.minPrice}
            placeholderTextColor={COLORS.gray}
            keyboardType="numeric"
            value={filters.priceMin ? String(filters.priceMin) : ''}
            onChangeText={(v) => setFilters((f) => ({ ...f, priceMin: v ? Number(v) : undefined }))}
          />
          <Text style={styles.priceSep}>—</Text>
          <TextInput
            style={styles.priceInput}
            placeholder={t.filters.maxPrice}
            placeholderTextColor={COLORS.gray}
            keyboardType="numeric"
            value={filters.priceMax ? String(filters.priceMax) : ''}
            onChangeText={(v) => setFilters((f) => ({ ...f, priceMax: v ? Number(v) : undefined }))}
          />
        </View>

        {/* Toggle options */}
        <Text style={styles.sectionLabel}>{t.filters.options}</Text>
        <View style={styles.toggleList}>
          <ToggleRow
            label={`🏷️ ${t.filters.onSale}`}
            active={filters.onlySale}
            onToggle={() => setFilters((f) => ({ ...f, onlySale: !f.onlySale }))}
          />
          <ToggleRow
            label={`🌿 ${t.filters.organic}`}
            active={filters.onlyOrganic}
            onToggle={() => setFilters((f) => ({ ...f, onlyOrganic: !f.onlyOrganic }))}
          />
          <ToggleRow
            label={`⭐ ${t.filters.expertPick}`}
            active={filters.onlyExpert}
            onToggle={() => setFilters((f) => ({ ...f, onlyExpert: !f.onlyExpert }))}
          />
        </View>

        {/* Apply button */}
        <Pressable onPress={handleApply} style={styles.applyBtn}>
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
          <Text style={styles.applyText}>{t.filters.apply}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function ToggleRow({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow}>
      <Text style={styles.toggleLabel}>{label}</Text>
      <View style={[styles.toggle, active && styles.toggleActive]}>
        <View style={[styles.toggleDot, active && styles.toggleDotActive]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.grayLight,
    alignSelf: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.black,
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.burgundy,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  typeRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.cream,
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    fontSize: 15,
    color: COLORS.black,
    textAlign: 'center',
  },
  priceSep: {
    fontSize: 16,
    color: COLORS.gray,
  },
  toggleList: {
    gap: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2,
  },
  toggleLabel: {
    fontSize: 15,
    color: COLORS.black,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.grayLight,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: COLORS.burgundy,
  },
  toggleDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  applyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.burgundy,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.lg,
  },
  applyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
});
