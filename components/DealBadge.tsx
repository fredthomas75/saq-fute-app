import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  dealScore: number;
  size?: 'sm' | 'md';
}

export default function DealBadge({ dealScore, size = 'sm' }: Props) {
  const colors = useThemeColors();

  if (dealScore < 80) return null;

  const isTrouvaille = dealScore >= 95;
  const isAubaine = dealScore >= 88;

  const bgColor = isTrouvaille ? COLORS.gold : isAubaine ? COLORS.green : colors.burgundy + '20';
  const textColor = isAubaine ? '#FFFFFF' : colors.burgundy;
  const label = isTrouvaille ? '🏆 TROUVAILLE!' : isAubaine ? '🔥 Aubaine' : '👍 Bon rapport Q/P';

  return (
    <View style={[styles.badge, size === 'md' && styles.badgeMd, { backgroundColor: bgColor }]}>
      <Text style={[styles.text, size === 'md' && styles.textMd, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  badgeMd: {
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
  textMd: {
    fontSize: 12,
  },
});
