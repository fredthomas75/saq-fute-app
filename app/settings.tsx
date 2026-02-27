import React from 'react';
import { View, Text, ScrollView, Pressable, Switch, Alert, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { useFavorites } from '@/context/FavoritesContext';
import { useCellar } from '@/context/CellarContext';
import { useTasteProfile } from '@/context/TasteProfileContext';
import { useTranslation } from '@/i18n';
import type { Locale } from '@/i18n';
import Logo from '@/components/Logo';

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
  const router = useRouter();
  const { language, setLanguage, theme, setTheme, notifications, setNotifications } = useSettings();
  const { favorites, clearAll } = useFavorites();
  const { cellar, totalBottles, clearCellar } = useCellar();
  const { profile, clearProfile } = useTasteProfile();

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
        { text: t.settings.confirm, style: 'destructive', onPress: () => clearAll() },
      ]
    );
  };

  const handleClearCellar = () => {
    Alert.alert(
      t.cellar.clearCellarConfirm,
      t.cellar.clearCellarConfirmMsg,
      [
        { text: t.settings.cancel, style: 'cancel' },
        { text: t.settings.confirm, style: 'destructive', onPress: clearCellar },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Quick actions */}
      <Text style={styles.sectionHeader}>{t.settings.data}</Text>
      <View style={styles.quickActions}>
        <Pressable onPress={() => router.push('/cellar')} style={styles.quickBtn}>
          <Ionicons name="wine-outline" size={24} color={COLORS.burgundy} />
          <Text style={styles.quickLabel}>{t.cellar.title}</Text>
          {totalBottles > 0 && <Text style={styles.quickBadge}>{totalBottles}</Text>}
        </Pressable>
        <Pressable onPress={() => router.push('/quiz')} style={styles.quickBtn}>
          <Ionicons name="sparkles" size={24} color={COLORS.gold} />
          <Text style={styles.quickLabel}>{t.quiz.title}</Text>
          {profile?.completed && <Ionicons name="checkmark-circle" size={16} color={COLORS.gold} />}
        </Pressable>
        <Pressable onPress={() => router.push('/map')} style={styles.quickBtn}>
          <Ionicons name="globe-outline" size={24} color={COLORS.burgundy} />
          <Text style={styles.quickLabel}>{t.map.title}</Text>
        </Pressable>
      </View>

      {/* Language */}
      <Text style={styles.sectionHeader}>{t.settings.language}</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t.settings.language}</Text>
        <Text style={styles.cardSub}>{t.settings.languageSub}</Text>
        <View style={styles.optionRow}>
          {LANGUAGES.map((lang) => (
            <Pressable
              key={lang.key}
              onPress={() => setLanguage(lang.key)}
              style={[styles.optionBtn, language === lang.key && styles.optionBtnActive]}
            >
              <Text style={styles.optionFlag}>{lang.flag}</Text>
              <Text style={[styles.optionLabel, language === lang.key && styles.optionLabelActive]}>
                {t.settings[lang.labelKey]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Appearance */}
      <Text style={styles.sectionHeader}>{t.settings.appearance}</Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>{t.settings.theme}</Text>
        <View style={styles.optionRow}>
          {THEMES.map((th) => (
            <Pressable
              key={th.key}
              onPress={() => setTheme(th.key)}
              style={[styles.themeBtn, theme === th.key && styles.themeBtnActive]}
            >
              <Ionicons
                name={th.icon}
                size={20}
                color={theme === th.key ? COLORS.white : COLORS.grayDark}
              />
              <Text style={[styles.themeLabel, theme === th.key && styles.themeLabelActive]}>
                {themeLabels[th.key]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.card}>
        <View style={styles.switchRow}>
          <View style={styles.switchInfo}>
            <Text style={styles.cardLabel}>{t.settings.notifications}</Text>
            <Text style={styles.cardSub}>{t.settings.notificationsSub}</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={setNotifications}
            trackColor={{ false: COLORS.grayLight, true: COLORS.burgundyLight }}
            thumbColor={notifications ? COLORS.burgundy : COLORS.gray}
          />
        </View>
      </View>

      {/* Data management */}
      <Text style={styles.sectionHeader}>{t.settings.data}</Text>
      <View style={styles.card}>
        <Pressable onPress={handleClearFavorites} style={styles.dangerRow}>
          <View>
            <Text style={styles.cardLabel}>{t.settings.clearFavorites}</Text>
            <Text style={styles.cardSub}>
              {t.settings.clearFavoritesSub} ({favorites.length})
            </Text>
          </View>
          <Ionicons name="trash-outline" size={20} color={COLORS.red} />
        </Pressable>
      </View>

      {cellar.length > 0 && (
        <View style={styles.card}>
          <Pressable onPress={handleClearCellar} style={styles.dangerRow}>
            <View>
              <Text style={styles.cardLabel}>{t.cellar.clearCellar}</Text>
              <Text style={styles.cardSub}>
                {t.cellar.clearCellarSub} ({totalBottles})
              </Text>
            </View>
            <Ionicons name="trash-outline" size={20} color={COLORS.red} />
          </Pressable>
        </View>
      )}

      {profile?.completed && (
        <View style={styles.card}>
          <Pressable onPress={clearProfile} style={styles.dangerRow}>
            <View>
              <Text style={styles.cardLabel}>{t.quiz.retake}</Text>
              <Text style={styles.cardSub}>{t.quiz.myProfile}</Text>
            </View>
            <Ionicons name="refresh-outline" size={20} color={COLORS.burgundy} />
          </Pressable>
        </View>
      )}

      {/* About */}
      <Text style={styles.sectionHeader}>{t.settings.about}</Text>
      <View style={[styles.card, styles.aboutCard]}>
        <Logo size={64} color={COLORS.burgundy} accentColor={COLORS.gold} />
        <Text style={styles.aboutTitle}>{t.settings.appName}</Text>
        <Text style={styles.aboutDesc}>{t.settings.appDescription}</Text>
        <Text style={styles.aboutVersion}>{t.settings.version} 1.0.0</Text>
        <Text style={styles.aboutMade}>{t.settings.madeIn}</Text>
      </View>

      <View style={{ height: SPACING.xl * 2 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: SPACING.md },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    ...SHADOWS.card,
  },
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  quickBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.white,
    backgroundColor: COLORS.burgundy,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.card,
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.gray,
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
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  optionBtnActive: {
    borderColor: COLORS.burgundy,
    backgroundColor: COLORS.burgundy,
  },
  optionFlag: {
    fontSize: 20,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  optionLabelActive: {
    color: COLORS.white,
  },
  themeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.grayLight,
    backgroundColor: COLORS.white,
  },
  themeBtnActive: {
    borderColor: COLORS.burgundy,
    backgroundColor: COLORS.burgundy,
  },
  themeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.grayDark,
  },
  themeLabelActive: {
    color: COLORS.white,
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
    color: COLORS.burgundy,
    marginTop: SPACING.md,
  },
  aboutDesc: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  aboutVersion: {
    fontSize: 13,
    color: COLORS.grayLight,
    marginTop: SPACING.md,
  },
  aboutMade: {
    fontSize: 13,
    color: COLORS.gray,
    marginTop: SPACING.xs,
  },
});
