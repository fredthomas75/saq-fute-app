import React from 'react';
import { Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SPACING } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import Logo from '@/components/Logo';

interface Props {
  subtitle?: string;
}

export default function HeaderLogo({ subtitle }: Props) {
  const router = useRouter();
  const { vipMode } = useSettings();
  const { width } = useWindowDimensions();
  const compact = width < 500;

  return (
    <Pressable onPress={() => router.replace('/')} style={styles.headerLogoRow}>
      <Logo
        size={compact ? 22 : 28}
        color={vipMode ? COLORS.gold : COLORS.cream}
        accentColor={COLORS.gold}
      />
      {subtitle ? (
        <Text
          style={[
            styles.headerSubtitle,
            vipMode && { color: COLORS.gold },
            compact && styles.headerSubtitleCompact,
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : (
        <Text
          style={[
            styles.headerLogoText,
            vipMode && { color: COLORS.gold },
            compact && styles.headerLogoTextCompact,
          ]}
          numberOfLines={1}
        >
          SAQ Futé
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: SPACING.sm,
  },
  headerLogoText: {
    color: COLORS.cream,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  headerLogoTextCompact: {
    fontSize: 15,
  },
  headerSubtitle: {
    color: COLORS.cream,
    fontSize: 16,
    fontWeight: '600',
    opacity: 0.85,
    flexShrink: 1,
  },
  headerSubtitleCompact: {
    fontSize: 13,
  },
});
