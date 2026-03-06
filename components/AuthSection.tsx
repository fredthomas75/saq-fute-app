import React from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/i18n';

export default function AuthSection() {
  const t = useTranslation();
  const colors = useThemeColors();
  const { user, isAuthenticated, isLoading, isSyncing, signInWithGoogle, signInWithApple, signOut, syncNow } = useAuth();

  if (isLoading) {
    return (
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <ActivityIndicator size="small" color={colors.burgundy} />
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.gray }]}>{t.auth.sectionTitle}</Text>
        <View style={[styles.card, { backgroundColor: colors.white }]}>
          {/* User info */}
          <View style={styles.userRow}>
            <View style={[styles.avatar, { backgroundColor: colors.burgundy }]}>
              <Text style={styles.avatarText}>
                {(user.email || user.user_metadata?.full_name || '?')[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.userName, { color: colors.black }]}>
                {user.user_metadata?.full_name || user.email?.split('@')[0] || 'User'}
              </Text>
              <Text style={[styles.userEmail, { color: colors.gray }]}>{user.email}</Text>
            </View>
          </View>

          {/* Sync button */}
          <Pressable
            onPress={syncNow}
            disabled={isSyncing}
            style={[styles.syncBtn, { backgroundColor: colors.burgundy }, isSyncing && styles.syncBtnDisabled]}
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="sync-outline" size={18} color="#FFFFFF" />
            )}
            <Text style={styles.syncBtnText}>
              {isSyncing ? t.auth.syncing : t.auth.syncNow}
            </Text>
          </Pressable>

          {/* Sign out */}
          <Pressable
            onPress={() => {
              if (Platform.OS === 'web') {
                if (window.confirm(t.auth.signOutConfirmMsg)) {
                  signOut();
                }
              } else {
                Alert.alert(t.auth.signOutConfirm, t.auth.signOutConfirmMsg, [
                  { text: t.settings.cancel, style: 'cancel' },
                  { text: t.auth.signOut, style: 'destructive', onPress: signOut },
                ]);
              }
            }}
            style={styles.signOutBtn}
          >
            <Ionicons name="log-out-outline" size={18} color={COLORS.red} />
            <Text style={styles.signOutText}>{t.auth.signOut}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Not authenticated — show sign in options
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.gray }]}>{t.auth.sectionTitle}</Text>
      <View style={[styles.card, { backgroundColor: colors.white }]}>
        <View style={styles.signInHeader}>
          <Ionicons name="cloud-outline" size={32} color={colors.burgundy} />
          <Text style={[styles.signInDesc, { color: colors.gray }]}>{t.auth.signInDescription}</Text>
        </View>

        {/* Google Sign In */}
        <Pressable onPress={signInWithGoogle} style={[styles.googleBtn, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
          <View style={styles.googleIcon}>
            <Text style={styles.googleG}>G</Text>
          </View>
          <Text style={[styles.googleText, { color: colors.black }]}>{t.auth.signInWithGoogle}</Text>
        </Pressable>

        {/* Apple Sign In — coming soon */}
        <View style={styles.appleBtnDisabled}>
          <Ionicons name="logo-apple" size={20} color="#FFFFFF" style={{ opacity: 0.5 }} />
          <Text style={[styles.appleText, { opacity: 0.5 }]}>{t.auth.signInWithApple}</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>{t.auth.comingSoon}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.md,
  },
  card: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    ...SHADOWS.card,
  },
  // Sign-in state
  signInHeader: {
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  signInDesc: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    marginBottom: SPACING.sm,
  },
  googleIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleG: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleText: {
    fontSize: 15,
    fontWeight: '600',
  },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#000',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
  },
  appleBtnDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#555',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    position: 'relative' as const,
  },
  comingSoonBadge: {
    position: 'absolute' as const,
    right: 10,
    backgroundColor: COLORS.gold,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  comingSoonText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#1E1408',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  appleText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  // Authenticated state
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 13,
    marginTop: 2,
  },
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginBottom: SPACING.sm,
  },
  syncBtnDisabled: {
    opacity: 0.6,
  },
  syncBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.red,
  },
});
