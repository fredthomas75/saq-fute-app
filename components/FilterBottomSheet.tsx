import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, Modal, TextInput, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { TYPE_COLORS } from '@/constants/wine';
import { useTranslation } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';

const WINE_TYPE_KEYS = ['Rouge', 'Blanc', 'Rosé', 'Mousseux'];

export interface FilterState {
  type?: string;
  country?: string;
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
  countries?: { country: string; count: number }[];
}

export default function FilterBottomSheet({ visible, onClose, onApply, initialFilters, countries }: Props) {
  const t = useTranslation();
  const colors = useThemeColors();
  const { height: screenHeight } = useWindowDimensions();
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [countryOpen, setCountryOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  useEffect(() => {
    if (visible) {
      setFilters(initialFilters);
      setCountryOpen(false);
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
    // Auto-swap if min > max
    const corrected = { ...filters };
    if (corrected.priceMin && corrected.priceMax && corrected.priceMin > corrected.priceMax) {
      const tmp = corrected.priceMin;
      corrected.priceMin = corrected.priceMax;
      corrected.priceMax = tmp;
      setFilters(corrected);
    }
    onApply(corrected);
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
    filters.country,
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
      <Animated.View style={[styles.sheet, { backgroundColor: colors.white, transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.grayLight }]} />

        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.black }]}>{t.filters.title}</Text>
          {activeCount > 0 && (
            <Pressable onPress={handleReset} hitSlop={8}>
              <Text style={[styles.resetText, { color: colors.burgundy }]}>{t.filters.reset}</Text>
            </Pressable>
          )}
        </View>

        {/* Wine type */}
        <Text style={[styles.sectionLabel, { color: colors.gray }]}>{t.filters.type}</Text>
        <View style={styles.typeRow}>
          {WINE_TYPE_KEYS.map((type) => {
            const isActive = filters.type === type;
            const label = t.wineTypes[type] || type;
            return (
              <Pressable
                key={type}
                onPress={() => setFilters((f) => ({ ...f, type: f.type === type ? undefined : type }))}
                style={[styles.typeChip, { backgroundColor: colors.cream, borderColor: colors.grayLight }, isActive && { backgroundColor: TYPE_COLORS[type], borderColor: TYPE_COLORS[type] }]}
              >
                <Text style={[styles.typeChipText, { color: colors.grayDark }, isActive && { color: '#FFFFFF' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Country dropdown */}
        {countries && countries.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.gray }]}>{t.filters.country}</Text>
            <Pressable
              onPress={() => setCountryOpen((o) => !o)}
              style={[styles.dropdown, { borderColor: colors.grayLight, backgroundColor: colors.cream }]}
            >
              <Text style={[styles.dropdownText, { color: filters.country ? colors.black : colors.gray }]}>
                {filters.country || t.filters.allCountries}
              </Text>
              <Ionicons name={countryOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.gray} />
            </Pressable>
            {countryOpen && (
              <ScrollView style={[styles.dropdownList, { borderColor: colors.grayLight, backgroundColor: colors.cream }]} nestedScrollEnabled>
                <Pressable
                  onPress={() => { setFilters((f) => ({ ...f, country: undefined })); setCountryOpen(false); }}
                  style={[styles.dropdownItem, !filters.country && { backgroundColor: colors.burgundy + '15' }]}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.black }, !filters.country && { color: colors.burgundy, fontWeight: '700' }]}>{t.filters.allCountries}</Text>
                </Pressable>
                {countries.map((c) => {
                  const isActive = filters.country === c.country;
                  return (
                    <Pressable
                      key={c.country}
                      onPress={() => { setFilters((f) => ({ ...f, country: c.country })); setCountryOpen(false); }}
                      style={[styles.dropdownItem, isActive && { backgroundColor: colors.burgundy + '15' }]}
                    >
                      <Text style={[styles.dropdownItemText, { color: colors.black }, isActive && { color: colors.burgundy, fontWeight: '700' }]}>{c.country}</Text>
                      <Text style={[styles.dropdownItemCount, { color: colors.gray }]}>{c.count}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
          </>
        )}

        {/* Price range */}
        <Text style={[styles.sectionLabel, { color: colors.gray }]}>{t.filters.priceRange}</Text>
        <View style={styles.priceRow}>
          <View style={[styles.priceInputWrap, { borderColor: colors.grayLight, backgroundColor: colors.cream }]}>
            <Text style={[styles.priceCurrency, { color: colors.gray }]}>$</Text>
            <TextInput
              style={[styles.priceInput, { color: colors.black }]}
              placeholder={t.filters.minPrice}
              placeholderTextColor={colors.grayLight}
              keyboardType="numeric"
              inputMode="numeric"
              value={filters.priceMin ? String(filters.priceMin) : ''}
              onChangeText={(v) => {
                const num = v.replace(/[^0-9]/g, '');
                setFilters((f) => ({ ...f, priceMin: num ? Number(num) : undefined }));
              }}
              accessibilityLabel={t.filters.minPrice}
            />
          </View>
          <Text style={[styles.priceSep, { color: colors.gray }]}>—</Text>
          <View style={[styles.priceInputWrap, { borderColor: colors.grayLight, backgroundColor: colors.cream }]}>
            <Text style={[styles.priceCurrency, { color: colors.gray }]}>$</Text>
            <TextInput
              style={[styles.priceInput, { color: colors.black }]}
              placeholder={t.filters.maxPrice}
              placeholderTextColor={colors.grayLight}
              keyboardType="numeric"
              inputMode="numeric"
              value={filters.priceMax ? String(filters.priceMax) : ''}
              onChangeText={(v) => {
                const num = v.replace(/[^0-9]/g, '');
                setFilters((f) => ({ ...f, priceMax: num ? Number(num) : undefined }));
              }}
              accessibilityLabel={t.filters.maxPrice}
            />
          </View>
        </View>

        {/* Toggle options */}
        <Text style={[styles.sectionLabel, { color: colors.gray }]}>{t.filters.options}</Text>
        <View style={styles.toggleList}>
          <ToggleRow
            label={`🏷️ ${t.filters.onSale}`}
            active={filters.onlySale}
            onToggle={() => setFilters((f) => ({ ...f, onlySale: !f.onlySale }))}
            textColor={colors.black}
            trackColor={colors.grayLight}
          />
          <ToggleRow
            label={`🌿 ${t.filters.organic}`}
            active={filters.onlyOrganic}
            onToggle={() => setFilters((f) => ({ ...f, onlyOrganic: !f.onlyOrganic }))}
            textColor={colors.black}
            trackColor={colors.grayLight}
          />
          <ToggleRow
            label={`⭐ ${t.filters.expertPick}`}
            active={filters.onlyExpert}
            onToggle={() => setFilters((f) => ({ ...f, onlyExpert: !f.onlyExpert }))}
            textColor={colors.black}
            trackColor={colors.grayLight}
          />
        </View>

        {/* Apply button */}
        <Pressable onPress={handleApply} style={styles.applyBtn}>
          <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          <Text style={styles.applyText}>{t.filters.apply}</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

function ToggleRow({ label, active, onToggle, textColor, trackColor }: { label: string; active: boolean; onToggle: () => void; textColor?: string; trackColor?: string }) {
  return (
    <Pressable onPress={onToggle} style={styles.toggleRow} accessibilityLabel={label} accessibilityRole="switch" accessibilityState={{ checked: active }}>
      <Text style={[styles.toggleLabel, textColor ? { color: textColor } : undefined]}>{label}</Text>
      <View style={[styles.toggle, trackColor ? { backgroundColor: trackColor } : undefined, active && styles.toggleActive]}>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
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
  },
  resetText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
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
  },
  typeChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownList: {
    maxHeight: 160,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: RADIUS.sm,
    borderBottomRightRadius: RADIUS.sm,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm - 2,
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  dropdownItemCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  priceInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    minWidth: 0,
  },
  priceCurrency: {
    fontSize: 15,
    fontWeight: '600',
    marginRight: 4,
  },
  priceInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: SPACING.sm,
    minWidth: 0,
  },
  priceSep: {
    fontSize: 16,
    flexShrink: 0,
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
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
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
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
  },
});
