import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { useWineNotes } from '@/context/WineNotesContext';
import { useTranslation } from '@/i18n';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/LoadingState';
import type { Wine } from '@/types/wine';

const TYPE_COLORS: Record<string, string> = {
  Rouge: '#722F37',
  Blanc: '#C5A572',
  Rosé: '#E8A0BF',
  Mousseux: '#7FB3D8',
};

export default function CompareScreen() {
  const t = useTranslation();
  const params = useLocalSearchParams<{ wine?: string }>();
  const { getNote } = useWineNotes();
  const [wine1, setWine1] = useState('');
  const [wine2, setWine2] = useState('');
  const [result, setResult] = useState<{ comparison: Wine[]; verdict: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.wine) {
      setWine1(params.wine);
    }
  }, [params.wine]);

  const doCompare = async () => {
    if (!wine1.trim() || !wine2.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await saqApi.compare(wine1.trim(), wine2.trim());
      if (data.error) {
        setError(data.error);
        setResult(null);
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const swapWines = () => {
    setWine1(wine2);
    setWine2(wine1);
  };

  const renderWineColumn = (wine: Wine, index: number) => {
    const note = getNote(wine.id);
    const typeColor = TYPE_COLORS[wine.type] || COLORS.gray;
    const isWinner = result && result.comparison.length === 2 &&
      wine.dealScore >= result.comparison[1 - index].dealScore;

    return (
      <View key={index} style={[styles.wineCol, isWinner && styles.winnerCol]}>
        {isWinner && (
          <View style={styles.winnerBadge}>
            <Ionicons name="trophy" size={12} color={COLORS.white} />
            <Text style={styles.winnerText}>{t.compare?.winner || 'Meilleur choix'}</Text>
          </View>
        )}

        <View style={[styles.typePill, { backgroundColor: typeColor }]}>
          <Text style={styles.typePillText}>{wine.type}</Text>
        </View>

        <Text style={styles.wineName} numberOfLines={3}>{wine.name}</Text>

        <Text style={styles.winePrice}>{wine.price?.toFixed(2)}$</Text>
        {wine.onSale && wine.originalPrice && (
          <Text style={styles.origPrice}>{wine.originalPrice.toFixed(2)}$</Text>
        )}

        <View style={styles.divider} />

        <CompareRow label={t.wineDetail.country} value={wine.country} />
        {wine.region && <CompareRow label={t.wineDetail.region} value={wine.region} />}
        {wine.grapes && wine.grapes.length > 0 && (
          <CompareRow label={t.wineDetail.grapes} value={wine.grapes.join(', ')} />
        )}
        {wine.tasteProfile && <CompareRow label={t.wineDetail.profile} value={wine.tasteProfile} />}

        <View style={styles.divider} />

        <View style={[styles.scoreBadge, {
          backgroundColor: wine.dealScore >= 95 ? COLORS.gold :
            wine.dealScore >= 88 ? COLORS.green : COLORS.grayLight
        }]}>
          <Text style={[styles.scoreText, {
            color: wine.dealScore >= 88 ? COLORS.white : COLORS.grayDark
          }]}>
            {wine.dealLabel}
          </Text>
        </View>

        {wine.expertRatings && wine.expertRatings.length > 0 && (
          <View style={styles.expertSection}>
            {wine.expertRatings.map((r, i) => (
              <Text key={i} style={styles.expertLine}>{r.source}: {r.score}/100</Text>
            ))}
          </View>
        )}

        {note?.rating && note.rating > 0 && (
          <View style={styles.userRating}>
            <Text style={styles.userRatingLabel}>{t.wineNotes?.myRating || 'Ma note'}</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons
                  key={s}
                  name={s <= note.rating! ? 'star' : 'star-outline'}
                  size={14}
                  color={s <= note.rating! ? COLORS.gold : COLORS.grayLight}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.compare.title}</Text>

      <SearchBar value={wine1} onChangeText={setWine1} placeholder={t.compare.wine1Placeholder} />

      <Pressable onPress={swapWines} style={styles.swapBtn}>
        <Ionicons name="swap-vertical" size={22} color={COLORS.burgundy} />
        <Text style={styles.vs}>VS</Text>
      </Pressable>

      <SearchBar value={wine2} onChangeText={setWine2} placeholder={t.compare.wine2Placeholder} />

      <Pressable
        onPress={doCompare}
        style={[styles.compareBtn, (!wine1.trim() || !wine2.trim()) && { opacity: 0.5 }]}
        disabled={!wine1.trim() || !wine2.trim()}
      >
        <Ionicons name="git-compare-outline" size={20} color={COLORS.white} />
        <Text style={styles.compareBtnText}>{t.compare.compareButton}</Text>
      </Pressable>

      {loading && <LoadingState />}

      {error && (
        <View style={styles.errorCard}>
          <Ionicons name="alert-circle" size={20} color={COLORS.red} />
          <Text style={styles.error}>{error}</Text>
        </View>
      )}

      {result && result.comparison && (
        <>
          <View style={styles.verdictCard}>
            <Ionicons name="bulb-outline" size={20} color={COLORS.gold} />
            <Text style={styles.verdict}>{result.verdict}</Text>
          </View>

          <View style={styles.comparisonRow}>
            {result.comparison.map((w, i) => renderWineColumn(w, i))}
          </View>
        </>
      )}

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.compareRow}>
      <Text style={styles.compareLabel}>{label}</Text>
      <Text style={styles.compareValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: SPACING.md },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  swapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  vs: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.burgundy,
  },
  compareBtn: {
    backgroundColor: COLORS.burgundy,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    marginHorizontal: SPACING.md,
  },
  compareBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.red + '10',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  error: {
    color: COLORS.red,
    fontSize: 14,
    flex: 1,
  },
  verdictCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
    ...SHADOWS.card,
  },
  verdict: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.burgundy,
    flex: 1,
    lineHeight: 22,
  },
  comparisonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  wineCol: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 2,
    borderColor: 'transparent',
    ...SHADOWS.card,
  },
  winnerCol: {
    borderColor: COLORS.gold,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.gold,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  winnerText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: SPACING.sm,
  },
  typePillText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '600',
  },
  wineName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SPACING.sm,
    minHeight: 42,
  },
  winePrice: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.burgundy,
  },
  origPrice: {
    fontSize: 13,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
    marginBottom: SPACING.xs,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.grayLight,
    marginVertical: SPACING.sm,
  },
  compareRow: {
    marginBottom: SPACING.xs,
  },
  compareLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  compareValue: {
    fontSize: 13,
    color: COLORS.black,
    fontWeight: '500',
  },
  scoreBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  scoreText: {
    fontSize: 11,
    fontWeight: '700',
  },
  expertSection: {
    marginTop: SPACING.sm,
  },
  expertLine: {
    fontSize: 12,
    color: COLORS.grayDark,
    marginBottom: 2,
  },
  userRating: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.grayLight,
  },
  userRatingLabel: {
    fontSize: 11,
    color: COLORS.gray,
    fontWeight: '600',
    marginBottom: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
});
