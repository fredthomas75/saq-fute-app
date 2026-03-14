import React from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSettings } from '@/context/SettingsContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useWishlist } from '@/context/WishlistContext';
import { useTranslation } from '@/i18n';
import type { Locale } from '@/i18n';
import Logo from '@/components/Logo';
import AuthSection from '@/components/AuthSection';

const LANGUAGES: { key: Locale; flag: string; labelKey: 'french' | 'english' }[] = [
  { key: 'fr', flag: '🇫🇷', labelKey: 'french' },
  { key: 'en', flag: '🇬🇧', labelKey: 'english' },
];

const THEMES = [
  { key: 'auto' as const, icon: 'phone-portrait-outline' as const },
  { key: 'light' as const, icon: 'sunny-outline' as const },
  { key: 'dark' as const, icon: 'moon-outline' as const },
];

export default function SettingsScreen() {
  const t = useTranslation();
  const colors = useThemeColors();
  const { language, setLanguage, theme, setTheme, notifications, setNotifications, vipMode, toggleVipMode } = useSettings();
  const { favorites, clearAll: clearFavorites } = useFavorites();
  const { wishlist, clearAll: clearWishlist } = useWishlist();
  const themeLabels: Record<string, string> = {
    auto: t.settings.themeAuto,
    light: t.settings.themeLight,
    dark: t.settings.themeDark,
  };

  const handleClearFavorites = () => {
    Alert.alert(
      t.settings.clearFavoritesConfirm,
      t.settings.clearFavoritesConfirmMsg,
      [
        { text: t.settings.cancel, style: 'cancel' },
        { text: t.settings.confirm, style: 'destructive', onPress: () => clearFavorites() },
      ]
    );
  };

  const handleClearWishlist = () => {
    Alert.alert(
      t.wishlist.clearWishlistConfirm,
      t.wishlist.clearWishlistConfirmMsg,
      [
        { text: t.settings.cancel, style: 'cancel' },
        { text: t.settings.confirm, style: 'destructive', onPress: () => clearWishlist() },
      ]
    );
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} contentContainerStyle={styles.content}>
      {/* Account / Auth */}
      <AuthSection />

      {/* VIP Mode */}
      <Text style={[styles.sectionHeader, { color: colors.gray }]}>{t.vip.sectionTitle}</Text>
      <View style={[styles.card, { backgroundColor: colors.white }, vipMode && styles.vipCard]}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <View style={styles.vipLabelRow}>
              <Ionicons name="diamond" size={18} color={COLORS.gold} />
              <Text style={[styles.cardLabel, { color: colors.black }, vipMode && { color: COLORS.gold }]}>
                {t.vip.title}
              </Text>
            </View>
            <Text style={[styles.cardSub, { color: colors.gray }]}>{t.vip.description}</Text>
          </View>
          <Switch
            value={vipMode}
            onValueChange={toggleVipMode}
            trackColor={{ false: colors.grayLight, true: COLORS.goldLight }}
            thumbColor={vipMode ? COLORS.gold : colors.gray}
          />
        </View>
      </View>

      {/* Language */}
      <Text style={[styles.sectionHeader, { color: colors.gray }]}>{t.settings.language}</Text>
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <Text style={[styles.cardLabel, { color: colors.black }]}>{t.settings.language}</Text>
        <Text style={[styles.cardSub, { color: colors.gray }]}>{t.settings.languageSub}</Text>
        <View style={styles.optionRow}>
          {LANGUAGES.map((lang) => {
            const active = language === lang.key;
            return (
              <Pressable
                key={lang.key}
                onPress={() => setLanguage(lang.key)}
                style={[styles.optionBtn, { borderColor: colors.grayLight, backgroundColor: colors.white }, active && { borderColor: colors.burgundy, backgroundColor: colors.burgundy }]}
              >
                <Text style={styles.optionFlag}>{lang.flag}</Text>
                <Text style={[styles.optionLabel, { color: colors.grayDark }, active && { color: '#FFFFFF' }]}>
                  {t.settings[lang.labelKey]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Appearance */}
      <Text style={[styles.sectionHeader, { color: colors.gray }]}>{t.settings.appearance}</Text>
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <Text style={[styles.cardLabel, { color: colors.black }]}>{t.settings.theme}</Text>
        <View style={styles.optionRow}>
          {THEMES.map((th) => {
            const active = theme === th.key;
            return (
              <Pressable
                key={th.key}
                onPress={() => setTheme(th.key)}
                style={[styles.themeBtn, { borderColor: colors.grayLight, backgroundColor: colors.white }, active && { borderColor: colors.burgundy, backgroundColor: colors.burgundy }]}
              >
                <Ionicons
                  name={th.icon}
                  size={20}
                  color={active ? '#FFFFFF' : colors.grayDark}
                />
                <Text style={[styles.themeLabel, { color: colors.grayDark }, active && { color: '#FFFFFF' }]}>
                  {themeLabels[th.key]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={[styles.cardLabel, { color: colors.black }]}>{t.settings.notifications}</Text>
            <Text style={[styles.cardSub, { color: colors.gray }]}>{t.settings.notificationsSub}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: colors.grayLight, true: colors.burgundyLight || COLORS.burgundyLight }}
            thumbColor={notifications ? colors.burgundy : colors.gray}
          />
        </View>
      </View>

      {/* Data management */}
      <Text style={[styles.sectionHeader, { color: colors.gray }]}>{t.settings.data}</Text>

      {/* Clear favorites */}
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <Pressable onPress={handleClearFavorites} style={styles.dangerRow}>
          <View>
            <Text style={[styles.cardLabel, { color: colors.black }]}>{t.settings.clearFavorites}</Text>
            <Text style={[styles.cardSub, { color: colors.gray }]}>
              {t.settings.clearFavoritesSub} ({favorites.length})
            </Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={COLORS.red} />
        </Pressable>
      </View>

      {/* Clear wishlist */}
      {wishlist.length > 0 && (
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          <Pressable onPress={handleClearWishlist} style={styles.dangerRow}>
            <View>
              <Text style={[styles.cardLabel, { color: colors.black }]}>{t.wishlist.clearWishlist}</Text>
              <Text style={[styles.cardSub, { color: colors.gray }]}>
                {t.wishlist.clearWishlistSub} ({wishlist.length})
              </Text>
            </View>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          </Pressable>
        </View>
      )}

      {/* About */}
      <Text style={[styles.sectionHeader, { color: colors.gray }]}>{t.settings.about}</Text>
      <View style={[styles.card, styles.aboutCard, { backgroundColor: colors.white }]}>
        <Logo size={64} color={colors.burgundy} accentColor={COLORS.gold} />
        <Text style={[styles.aboutTitle, { color: colors.burgundy }]}>{t.settings.appName}</Text>
        <Text style={[styles.aboutDesc, { color: colors.gray }]}>{t.settings.appDescription}</Text>
        <Text style={[styles.aboutVersion, { color: colors.grayLight }]}>{t.settings.version} 1.0.0</Text>
        <Text style={[styles.aboutMade, { color: colors.gray }]}>{t.settings.madeIn}</Text>
      </View>

      <View style={{ height: SPACING.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: SPACING.md },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardSub: {
    fontSize: 13,
    marginTop: 2,
  },
  optionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
  },
  optionFlag: {
    fontSize: 20,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchInfo: {
    flex: 1,
    marginRight: SPACING.md,
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  aboutTitle: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: SPACING.md,
  },
  aboutDesc: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  aboutVersion: {
    fontSize: 13,
    marginTop: SPACING.md,
  },
  aboutMade: {
    fontSize: 13,
    marginTop: SPACING.xs,
  },
  vipCard: {
    borderWidth: 1.5,
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold + '08',
  },
  vipLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});
