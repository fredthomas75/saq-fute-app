import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { useTranslation } from '@/i18n';
import SearchBar from '@/components/SearchBar';
import LoadingState from '@/components/LoadingState';

export default function CompareScreen() {
  const t = useTranslation();
  const [wine1, setWine1] = useState('');
  const [wine2, setWine2] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t.compare.title}</Text>

      <SearchBar value={wine1} onChangeText={setWine1} placeholder={t.compare.wine1Placeholder} />
      <Text style={styles.vs}>VS</Text>
      <SearchBar value={wine2} onChangeText={setWine2} placeholder={t.compare.wine2Placeholder} />

      <Pressable onPress={doCompare} style={[styles.compareBtn, (!wine1 || !wine2) && { opacity: 0.5 }]}>
        <Text style={styles.compareBtnText}>{t.compare.compareButton}</Text>
      </Pressable>

      {loading && <LoadingState />}

      {error && <Text style={styles.error}>{error}</Text>}

      {result && result.comparison && (
        <>
          <View style={styles.verdictCard}>
            <Text style={styles.verdict}>{result.verdict}</Text>
          </View>

          <View style={styles.comparisonRow}>
            {result.comparison.map((w: any, i: number) => (
              <View key={i} style={styles.wineCol}>
                <Text style={styles.wineName} numberOfLines={2}>{w.name}</Text>
                <Text style={styles.winePrice}>{w.price?.toFixed(2)}$</Text>
                <Text style={styles.wineInfo}>{w.type} · {w.country}</Text>
                <Text style={styles.wineInfo}>{(w.grapes || []).join(', ')}</Text>
                <View style={[styles.scoreBadge, { backgroundColor: w.dealScore >= 88 ? COLORS.gold : COLORS.grayLight }]}>
                  <Text style={styles.scoreText}>{t.compare.score}: {w.dealScore}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: SPACING.md },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.black, textAlign: 'center', marginBottom: SPACING.md },
  vs: { fontSize: 20, fontWeight: '800', color: COLORS.burgundy, textAlign: 'center', marginVertical: SPACING.xs },
  compareBtn: { backgroundColor: COLORS.burgundy, paddingVertical: SPACING.md, borderRadius: RADIUS.md, marginTop: SPACING.md, marginHorizontal: SPACING.md },
  compareBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  error: { color: COLORS.red, textAlign: 'center', marginTop: SPACING.md },
  verdictCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.lg, marginTop: SPACING.lg, ...SHADOWS.card },
  verdict: { fontSize: 16, fontWeight: '700', color: COLORS.burgundy, textAlign: 'center' },
  comparisonRow: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  wineCol: { flex: 1, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, ...SHADOWS.card },
  wineName: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: SPACING.sm },
  winePrice: { fontSize: 22, fontWeight: '900', color: COLORS.burgundy, marginBottom: SPACING.xs },
  wineInfo: { fontSize: 13, color: COLORS.gray, marginBottom: 2 },
  scoreBadge: { marginTop: SPACING.sm, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm, alignSelf: 'flex-start' },
  scoreText: { fontSize: 12, fontWeight: '700', color: COLORS.black },
});
