import React from 'react';
import { View, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { useIsDark } from '@/hooks/useThemeColors';
import { hapticSelection } from '@/services/haptics';

export default function HeaderIcons() {
  const router = useRouter();
  const { vipMode, toggleVipMode } = useSettings();
  const isDark = useIsDark();
  const { width } = useWindowDimensions();
  const compact = width < 500;
  const iconColor = vipMode ? COLORS.gold : (isDark ? '#F5F5F5' : COLORS.white);
  const iconSize = compact ? 19 : 21;

  return (
    <View style={[styles.row, compact && styles.rowCompact]}>
      {/* VIP toggle */}
      <Pressable onPress={() => { hapticSelection(); toggleVipMode(); }} style={[styles.btn, compact && styles.btnCompact]} hitSlop={12}>
        {vipMode ? (
          <View style={styles.vipBadge}>
            <Ionicons name="diamond" size={compact ? 10 : 12} color={'#1E1408'} style={{ marginRight: 2 }} />
            <Text style={styles.vipText}>VIP</Text>
          </View>
        ) : (
          <Ionicons name="diamond-outline" size={iconSize} color={iconColor} style={{ opacity: 0.6 }} />
        )}
      </Pressable>
      <Pressable onPress={() => router.push('/cellar')} style={[styles.btn, compact && styles.btnCompact]} hitSlop={12}>
        <MaterialCommunityIcons name="bottle-wine-outline" size={iconSize + 1} color={iconColor} />
      </Pressable>
      <Pressable onPress={() => router.push('/wishlist')} style={[styles.btn, compact && styles.btnCompact]} hitSlop={12}>
        <Ionicons name="bookmark-outline" size={iconSize} color={iconColor} />
      </Pressable>
      <Pressable onPress={() => router.push('/map')} style={[styles.btn, compact && styles.btnCompact]} hitSlop={12}>
        <Ionicons name="map-outline" size={iconSize} color={iconColor} />
      </Pressable>
      <Pressable onPress={() => router.push('/settings')} style={[styles.btn, compact && styles.btnCompact]} hitSlop={12}>
        <Ionicons name="settings-outline" size={iconSize + 1} color={iconColor} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: SPACING.sm,
  },
  rowCompact: {
    gap: 0,
    paddingRight: 4,
  },
  btn: {
    padding: 8,
  },
  btnCompact: {
    padding: 5,
  },
  vipBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  vipText: {
    color: '#1E1408',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
