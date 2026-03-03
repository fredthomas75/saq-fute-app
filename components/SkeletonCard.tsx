import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';

function SkeletonPulse({ style }: { style?: any }) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return <Animated.View style={[styles.pulse, style, { opacity }]} />;
}

export default function SkeletonCard() {
  return (
    <View style={styles.card}>
      {/* Type badge */}
      <View style={styles.row}>
        <SkeletonPulse style={styles.badge} />
        <View style={{ flex: 1 }} />
        <SkeletonPulse style={styles.iconCircle} />
        <SkeletonPulse style={styles.iconCircle} />
      </View>

      {/* Name */}
      <SkeletonPulse style={styles.nameLine} />
      <SkeletonPulse style={[styles.nameLine, { width: '60%' }]} />

      {/* Meta */}
      <View style={[styles.row, { marginTop: SPACING.sm }]}>
        <SkeletonPulse style={styles.metaLine} />
        <SkeletonPulse style={[styles.metaLine, { width: 80 }]} />
      </View>

      {/* Price */}
      <View style={[styles.row, { marginTop: SPACING.sm }]}>
        <SkeletonPulse style={styles.priceLine} />
      </View>
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  pulse: {
    backgroundColor: COLORS.grayLight,
    borderRadius: RADIUS.sm,
  },
  badge: {
    width: 60,
    height: 22,
    borderRadius: RADIUS.full,
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  nameLine: {
    width: '85%',
    height: 16,
    marginTop: SPACING.sm,
    borderRadius: 4,
  },
  metaLine: {
    width: 100,
    height: 13,
    borderRadius: 4,
  },
  priceLine: {
    width: 70,
    height: 22,
    borderRadius: 4,
  },
  list: {
    paddingTop: SPACING.sm,
  },
});
