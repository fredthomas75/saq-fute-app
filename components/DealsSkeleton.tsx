import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

function Bone({ style }: { style?: any }) {
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

  return <Animated.View style={[styles.bone, style, { opacity }]} />;
}

function CompactCardSkeleton() {
  return (
    <View style={styles.compactCard}>
      <Bone style={styles.accent} />
      <View style={styles.compactInner}>
        <Bone style={styles.pill} />
        <Bone style={styles.line} />
        <Bone style={styles.lineShort} />
        <Bone style={styles.country} />
        <Bone style={styles.price} />
      </View>
    </View>
  );
}

function FullCardSkeleton() {
  return (
    <View style={styles.fullCard}>
      <View style={styles.fullRow}>
        <Bone style={styles.badge} />
        <View style={{ flex: 1, gap: 4 }}>
          <Bone style={styles.line} />
          <Bone style={styles.lineShort} />
          <Bone style={styles.country} />
        </View>
        <Bone style={styles.fullPrice} />
      </View>
    </View>
  );
}

export default function DealsSkeleton() {
  return (
    <View style={styles.container}>
      {/* Coups de Coeur section */}
      <View style={styles.header}>
        <Bone style={styles.titleBone} />
        <Bone style={styles.seeAllBone} />
      </View>
      <View style={styles.row}>
        <CompactCardSkeleton />
        <CompactCardSkeleton />
      </View>

      {/* Top Deals section */}
      <Bone style={[styles.titleBone, { marginTop: SPACING.lg, marginLeft: SPACING.md }]} />
      <View style={styles.budgetRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Bone key={i} style={styles.budgetPill} />
        ))}
      </View>
      <FullCardSkeleton />
      <FullCardSkeleton />
      <FullCardSkeleton />

      {/* En promo section */}
      <View style={[styles.header, { marginTop: SPACING.md }]}>
        <Bone style={styles.titleBone} />
        <Bone style={styles.seeAllBone} />
      </View>
      <View style={styles.row}>
        <CompactCardSkeleton />
        <CompactCardSkeleton />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, paddingTop: SPACING.md },
  bone: { backgroundColor: COLORS.grayLight, borderRadius: RADIUS.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.md, marginBottom: SPACING.sm },
  titleBone: { width: 180, height: 22 },
  seeAllBone: { width: 70, height: 16 },
  row: { flexDirection: 'row', paddingHorizontal: SPACING.md, gap: SPACING.sm },
  compactCard: { width: 185, borderRadius: RADIUS.md, backgroundColor: COLORS.white, overflow: 'hidden' },
  accent: { height: 4, borderRadius: 0 },
  compactInner: { padding: SPACING.sm, gap: 6 },
  pill: { width: 50, height: 16, borderRadius: RADIUS.full },
  line: { width: '100%', height: 14 },
  lineShort: { width: '60%', height: 14 },
  country: { width: '40%', height: 12 },
  price: { width: 60, height: 18, marginTop: 2 },
  budgetRow: { flexDirection: 'row', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, gap: SPACING.sm },
  budgetPill: { width: 50, height: 36, borderRadius: RADIUS.full },
  fullCard: { marginHorizontal: SPACING.md, marginBottom: SPACING.sm, backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md },
  fullRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  badge: { width: 40, height: 40 },
  fullPrice: { width: 55, height: 20 },
});
