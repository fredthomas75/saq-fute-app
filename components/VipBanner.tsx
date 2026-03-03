import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, VIP_COLORS } from '@/constants/theme';
import { useTranslation } from '@/i18n';

export default function VipBanner() {
  const t = useTranslation();
  return (
    <View style={styles.container}>
      <Ionicons name="diamond" size={14} color={COLORS.gold} />
      <Text style={styles.text}>{t.vip.bannerActive}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    backgroundColor: VIP_COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.gold + '40',
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
  },
});
