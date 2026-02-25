import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';

interface Props {
  label: string;
  active: boolean;
  onPress: () => void;
}

export default function FilterChip({ label, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
    marginRight: SPACING.sm,
  },
  chipActive: {
    backgroundColor: COLORS.burgundy,
    borderColor: COLORS.burgundy,
  },
  label: {
    fontSize: 14,
    color: COLORS.grayDark,
    fontWeight: '500',
  },
  labelActive: {
    color: COLORS.white,
  },
});
