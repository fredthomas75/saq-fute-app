import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '@/constants/theme';
import { useTranslation } from '@/i18n';

interface Props {
  icon?: string;
  message: string;
  submessage?: string;
  onRetry?: () => void;
}

export default function EmptyState({ icon = 'wine-outline', message, submessage, onRetry }: Props) {
  const t = useTranslation();

  return (
    <View style={styles.container}>
      <Ionicons name={icon as any} size={64} color={COLORS.grayLight} />
      <Text style={styles.message}>{message}</Text>
      {submessage && <Text style={styles.sub}>{submessage}</Text>}
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
    color: COLORS.grayDark,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  sub: {
    fontSize: 14,
    color: COLORS.gray,
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
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 15,
  },
});
