import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface Props {
  count?: number;
}

function SkeletonCard() {
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
    <Animated.View style={[styles.card, { opacity }]}>
      {/* Type pill + badge row */}
      <View style={styles.row}>
        <View style={styles.pill} />
        <View style={styles.pillSmall} />
      </View>
      {/* Title */}
      <View style={styles.titleLine} />
      <View style={styles.titleLineShort} />
      {/* Meta */}
      <View style={styles.row}>
        <View style={styles.metaBlock} />
        <View style={styles.metaBlock} />
      </View>
      {/* Price + deal */}
      <View style={styles.footer}>
        <View style={styles.priceLine} />
        <View style={styles.dealBlock} />
      </View>
    </Animated.View>
  );
}

export default function SkeletonLoader({ count = 4 }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
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
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.grayLight,
  },
  pillSmall: {
    width: 40,
    height: 20,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.grayLight,
  },
  titleLine: {
    width: '85%',
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.grayLight,
    marginBottom: 6,
  },
  titleLineShort: {
    width: '55%',
    height: 16,
    borderRadius: 4,
    backgroundColor: COLORS.grayLight,
    marginBottom: SPACING.sm,
  },
  metaBlock: {
    width: 90,
    height: 14,
    borderRadius: 4,
    backgroundColor: COLORS.grayLight,
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
    backgroundColor: COLORS.grayLight,
  },
  dealBlock: {
    width: 80,
    height: 24,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.grayLight,
  },
});
