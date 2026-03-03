import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/services/supabase';
import { COLORS } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (Platform.OS === 'web') {
          // Manually parse the hash fragment since detectSessionInUrl is false
          const hash = window.location.hash.substring(1);
          if (hash) {
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) console.warn('[auth/callback] setSession error:', error.message);
            }
          }
        }

        // Wait for auth state to propagate
        await new Promise((resolve) => setTimeout(resolve, 300));
      } catch (err) {
        console.warn('[auth/callback] Unexpected error:', err);
      }

      router.replace('/settings');
    };

    handleCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.burgundy} />
      <Text style={styles.text}>Connexion en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cream,
    gap: 16,
  },
  text: {
    fontSize: 16,
    color: COLORS.gray,
    marginTop: 8,
  },
});
