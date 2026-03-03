import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

function Bone({ style, boneBg }: { style?: any; boneBg: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return <Animated.View style={[styles.bone, { backgroundColor: boneBg }, style, { opacity }]} />;
}

function CompactCardSkeleton({ cardBg, boneBg }: { cardBg: string; boneBg: string }) {
  return (
    <View style={[styles.compactCard, { backgroundColor: cardBg }]}>
      <Bone boneBg={boneBg} style={styles.accent} />
      <View style={styles.compactInner}>
        <Bone boneBg={boneBg} style={styles.pill} />
        <Bone boneBg={boneBg} style={styles.line} />
        <Bone boneBg={boneBg} style={styles.lineShort} />
        <Bone boneBg={boneBg} style={styles.country} />
        <Bone boneBg={boneBg} style={styles.price} />
      </View>
    </View>
  );
}

function FullCardSkeleton({ cardBg, boneBg }: { cardBg: string; boneBg: string }) {
  return (
    <View style={[styles.fullCard, { backgroundColor: cardBg }]}>
      <View style={styles.fullRow}>
        <Bone boneBg={boneBg} style={styles.badge} />
        <View style={{ flex: 1, gap: 4 }}>
          <Bone boneBg={boneBg} style={styles.line} />
          <Bone boneBg={boneBg} style={styles.lineShort} />
          <Bone boneBg={boneBg} style={styles.country} />
        </View>
        <Bone boneBg={boneBg} style={styles.fullPrice} />
      </View>
    </View>
  );
}

export default function DealsSkeleton() {
  const colors = useThemeColors();
  const cardBg = colors.white;
  const boneBg = colors.grayLight;

  return (
    <View style={[styles.container, { backgroundColor: colors.cream }]}>
      {/* Coups de Coeur section */}
      <View style={styles.header}>
        <Bone boneBg={boneBg} style={styles.titleBone} />
        <Bone boneBg={boneBg} style={styles.seeAllBone} />
      </View>
      <View style={styles.row}>
        <CompactCardSkeleton cardBg={cardBg} boneBg={boneBg} />
        <CompactCardSkeleton cardBg={cardBg} boneBg={boneBg} />
      </View>

      {/* Top Deals section */}
      <Bone boneBg={boneBg} style={[styles.titleBone, { marginTop: SPACING.lg, marginLeft: SPACING.md }]} />
      <View style={styles.budgetRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} boneBg={boneBg} style={styles.budgetPill} />
        ))}
      </View>
      <FullCardSkeleton cardBg={cardBg} boneBg={boneBg} />
      <FullCardSkeleton cardBg={cardBg} boneBg={boneBg} />
      <FullCardSkeleton cardBg={cardBg} boneBg={boneBg} />

      {/* En promo section */}
      <View style={[styles.header, { marginTop: SPACING.md }]}>
        <Bone boneBg={boneBg} style={styles.titleBone} />
        <Bone boneBg={boneBg} style={styles.seeAllBone} />
      </View>
      <View style={styles.row}>
        <CompactCardSkeleton cardBg={cardBg} boneBg={boneBg} />
        <CompactCardSkeleton cardBg={cardBg} boneBg={boneBg} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: SPACING.md },
  bone: { borderRadius: RADIUS.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  titleBone: { width: 180, height: 22 },
  seeAllBone: { width: 70, height: 16 },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  compactCard: { width: 185, borderRadius: RADIUS.md, overflow: 'hidden' },
  accent: { height: 4, borderRadius: 0 },
  compactInner: { padding: SPACING.sm, gap: 6 },
  pill: { width: 50, height: 16, borderRadius: RADIUS.full },
  line: { width: '100%', height: 14 },
  lineShort: { width: '60%', height: 14 },
  country: { width: '40%', height: 12 },
  price: { width: 60, height: 18, marginTop: 2 },
  budgetRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  budgetPill: { width: 50, height: 36, borderRadius: RADIUS.full },
  fullCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, borderRadius: RADIUS.md, padding: SPACING.md },
  fullRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  badge: { width: 40, height: 40 },
  fullPrice: { width: 55, height: 20 },
});
