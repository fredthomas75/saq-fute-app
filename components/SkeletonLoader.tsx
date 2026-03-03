import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  count?: number;
}

function SkeletonCard({ cardBg, boneBg }: { cardBg: string; boneBg: string }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.card, { backgroundColor: cardBg, opacity }]}>
      {/* Type pill + badge row */}
      <View style={styles.row}>
        <View style={[styles.pill, { backgroundColor: boneBg }]} />
        <View style={[styles.pillSmall, { backgroundColor: boneBg }]} />
      </View>
      {/* Title */}
      <View style={[styles.titleLine, { backgroundColor: boneBg }]} />
      <View style={[styles.titleLineShort, { backgroundColor: boneBg }]} />
      {/* Meta */}
      <View style={styles.row}>
        <View style={[styles.metaBlock, { backgroundColor: boneBg }]} />
        <View style={[styles.metaBlock, { backgroundColor: boneBg }]} />
      </View>
      {/* Price + deal */}
      <View style={styles.footer}>
        <View style={[styles.priceLine, { backgroundColor: boneBg }]} />
        <View style={[styles.dealBlock, { backgroundColor: boneBg }]} />
      </View>
    </Animated.View>
  );
}

export default function SkeletonLoader({ count = 4 }: Props) {
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} cardBg={colors.white} boneBg={colors.grayLight} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  pill: {
    width: 60,
    height: 20,
    borderRadius: RADIUS.full,
  },
  pillSmall: {
    width: 40,
    height: 20,
    borderRadius: RADIUS.full,
  },
  titleLine: {
    width: '85%',
    height: 16,
    borderRadius: 4,
    marginBottom: 6,
  },
  titleLineShort: {
    width: '55%',
    height: 16,
    borderRadius: 4,
    marginBottom: SPACING.sm,
  },
  metaBlock: {
    width: 90,
    height: 14,
    borderRadius: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  priceLine: {
    width: 70,
    height: 22,
    borderRadius: 4,
  },
  dealBlock: {
    width: 80,
    height: 24,
    borderRadius: RADIUS.sm,
  },
});
