import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useSettings } from '@/context/SettingsContext';
import { saqApi } from '@/services/api';
import type { Wine, CompareResponse } from '@/types/wine';

export default function CompareScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const { language } = useSettings();
  const colors = useThemeColors();

  const [wine1, setWine1] = useState('');
  const [wine2, setWine2] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [error, setError] = useState('');

  const handleCompare = async () => {
    if (!wine1.trim() || !wine2.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const data = await saqApi.compare(wine1.trim(), wine2.trim(), language);
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError(t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const canCompare = wine1.trim().length > 0 && wine2.trim().length > 0 && !loading;

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Inputs */}
        <View style={styles.inputSection}>
          <View style={[styles.inputWrap, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
            <Ionicons name="wine-outline" size={18} color={colors.gray} />
            <TextInput
              style={[styles.input, { color: colors.black }]}
              placeholder={t.compare.wine1}
              placeholderTextColor={colors.gray}
              value={wine1}
              onChangeText={setWine1}
              returnKeyType="next"
            />
            {wine1.length > 0 && (
              <Pressable onPress={() => setWine1('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.gray} />
              </Pressable>
            )}
          </View>

          <View style={styles.vsContainer}>
            <Text style={[styles.vsText, { color: colors.burgundy }]}>{t.compare.vs}</Text>
          </View>

          <View style={[styles.inputWrap, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
            <Ionicons name="wine-outline" size={18} color={colors.gray} />
            <TextInput
              style={[styles.input, { color: colors.black }]}
              placeholder={t.compare.wine2}
              placeholderTextColor={colors.gray}
              value={wine2}
              onChangeText={setWine2}
              returnKeyType="done"
              onSubmitEditing={handleCompare}
            />
            {wine2.length > 0 && (
              <Pressable onPress={() => setWine2('')} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.gray} />
              </Pressable>
            )}
          </View>

          <Pressable
            onPress={handleCompare}
            disabled={!canCompare}
            style={[
              styles.compareBtn,
              { backgroundColor: canCompare ? colors.burgundy : colors.grayLight },
            ]}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <>
                <Ionicons name="swap-horizontal" size={20} color={canCompare ? COLORS.white : colors.gray} />
                <Text style={[styles.compareBtnText, { color: canCompare ? COLORS.white : colors.gray }]}>
                  {t.compare.button}
                </Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.loadingWrap}>
            <Text style={[styles.loadingText, { color: colors.gray }]}>{t.compare.loading}</Text>
          </View>
        )}

        {/* Error */}
        {error !== '' && !loading && (
          <View style={[styles.errorWrap, { backgroundColor: COLORS.red + '15' }]}>
            <Ionicons name="alert-circle" size={20} color={COLORS.red} />
            <Text style={[styles.errorText, { color: COLORS.red }]}>{error}</Text>
          </View>
        )}

        {/* Empty state */}
        {!result && !loading && error === '' && (
          <View style={styles.emptyWrap}>
            <Ionicons name="swap-horizontal-outline" size={48} color={colors.grayLight} />
            <Text style={[styles.emptyTitle, { color: colors.black }]}>{t.compare.empty}</Text>
            <Text style={[styles.emptySub, { color: colors.gray }]}>{t.compare.emptySub}</Text>
          </View>
        )}

        {/* Results */}
        {result && !loading && (
          <View style={styles.resultsSection}>
            {/* Verdict */}
            <View style={[styles.verdictCard, { backgroundColor: colors.white, borderColor: colors.burgundy + '30' }]}>
              <View style={styles.verdictHeader}>
                <Ionicons name="trophy" size={20} color={colors.burgundy} />
                <Text style={[styles.verdictLabel, { color: colors.burgundy }]}>{t.compare.verdict}</Text>
              </View>
              <Text style={[styles.verdictText, { color: colors.black }]}>{result.verdict}</Text>
            </View>

            {/* Side-by-side comparison */}
            {result.comparison.length >= 2 && (
              <View style={styles.comparisonRow}>
                <WineColumn wine={result.comparison[0]} colors={colors} />
                <View style={styles.vsDivider}>
                  <Text style={[styles.vsDividerText, { color: colors.burgundy }]}>{t.compare.vs}</Text>
                </View>
                <WineColumn wine={result.comparison[1]} colors={colors} />
              </View>
            )}

            {/* Disclaimer */}
            {result.disclaimer && (
              <Text style={[styles.disclaimer, { color: colors.gray }]}>{result.disclaimer}</Text>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function WineColumn({ wine, colors }: { wine: Wine; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={[styles.wineColumn, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
      <Text style={[styles.wineName, { color: colors.black }]} numberOfLines={3}>{wine.name}</Text>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.gray }]}>Type</Text>
        <View style={[styles.typeBadge, { backgroundColor: getTypeColor(wine.type) + '20' }]}>
          <Text style={[styles.typeText, { color: getTypeColor(wine.type) }]}>{wine.type}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.gray }]}>Prix</Text>
        <Text style={[styles.priceText, { color: colors.burgundy }]}>
          {wine.price?.toFixed(2)} $
        </Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.gray }]}>{t.wineDetail.country}</Text>
        <Text style={[styles.detailValue, { color: colors.black }]} numberOfLines={1}>{tc(wine.country)}</Text>
      </View>

      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.gray }]}>Deal</Text>
        <View style={[styles.dealBadge, { backgroundColor: getDealColor(wine.dealScore) + '20' }]}>
          <Text style={[styles.dealText, { color: getDealColor(wine.dealScore) }]}>
            {wine.dealScore}/10
          </Text>
        </View>
      </View>
    </View>
  );
}

function getTypeColor(type: string): string {
  switch (type) {
    case 'Rouge': return '#8B0000';
    case 'Blanc': return '#DAA520';
    case 'Rosé': return '#DB7093';
    case 'Mousseux': return '#4682B4';
    default: return COLORS.gray;
  }
}

function getDealColor(score: number): string {
  if (score >= 8) return COLORS.green;
  if (score >= 6) return COLORS.orange;
  return COLORS.red;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl * 2,
  },

  // Inputs
  inputSection: {
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: SPACING.xs,
  },
  vsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xs,
  },
  vsText: {
    fontSize: 16,
    fontWeight: '800',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.xs,
  },
  compareBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // Loading
  loadingWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: 15,
    marginTop: SPACING.sm,
  },

  // Error
  errorWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  errorText: {
    fontSize: 14,
    flex: 1,
  },

  // Empty state
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.sm,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },

  // Results
  resultsSection: {
    gap: SPACING.md,
  },
  verdictCard: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  verdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  verdictLabel: {
    fontSize: 16,
    fontWeight: '800',
  },
  verdictText: {
    fontSize: 15,
    lineHeight: 22,
  },

  // Comparison
  comparisonRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'flex-start',
  },
  vsDivider: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: SPACING.xl,
  },
  vsDividerText: {
    fontSize: 14,
    fontWeight: '800',
  },
  wineColumn: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  wineName: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
    marginBottom: SPACING.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  typeBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
  },
  dealBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  dealText: {
    fontSize: 13,
    fontWeight: '700',
  },
  disclaimer: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
