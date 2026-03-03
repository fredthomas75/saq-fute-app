import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/i18n';

interface Props {
  icon?: string;
  message: string;
  submessage?: string;
  onRetry?: () => void;
}

export default function EmptyState({ icon = 'wine-outline', message, submessage, onRetry }: Props) {
  const t = useTranslation();
  const colors = useThemeColors();

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color={colors.grayLight} />
      <Text style={[styles.message, { color: colors.grayDark }]}>{message}</Text>
      {submessage && <Text style={[styles.sub, { color: colors.gray }]}>{submessage}</Text>}
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryBtn}>
          <Text style={styles.retryText}>{t.common.retry}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.xl * 2,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  sub: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  retryBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.burgundy,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
});
