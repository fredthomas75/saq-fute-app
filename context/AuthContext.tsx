import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/services/supabase';
import type { User, Session } from '@supabase/supabase-js';
import {
  mergeFavorites, mergeCellar, mergeWishlist, mergeWineNotes, mergeSettings,
} from '@/services/sync';

// Dismiss any lingering browser window (needed for iOS)
WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isSyncing: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  isAuthenticated: false,
  isLoading: true,
  isSyncing: false,
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  signOut: async () => {},
  syncNow: async () => {},
});

// Callbacks that data contexts register for merge on login
type MergeCallback = (userId: string) => Promise<void>;
const mergeCallbacks: MergeCallback[] = [];

export function registerMergeCallback(cb: MergeCallback) {
  mergeCallbacks.push(cb);
  return () => {
    const idx = mergeCallbacks.indexOf(cb);
    if (idx >= 0) mergeCallbacks.splice(idx, 1);
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Restore session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getRedirectUri = useCallback(() => {
    if (Platform.OS === 'web') {
      return `${window.location.origin}/auth/callback`;
    }
    return makeRedirectUri({ path: 'auth/callback' });
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    const redirectTo = getRedirectUri();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    if (error) throw error;

    // On native, open browser manually
    if (Platform.OS !== 'web' && data.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type === 'success' && result.url) {
        // Extract tokens from the URL
        const url = new URL(result.url);
        const params = new URLSearchParams(url.hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        }
      }
    }
    // On web, the redirect happens automatically
  }, [getRedirectUri]);

  const signInWithGoogle = useCallback(() => signInWithProvider('google'), [signInWithProvider]);
  const signInWithApple = useCallback(() => signInWithProvider('apple'), [signInWithProvider]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const syncNow = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      // Call all registered merge callbacks from data contexts
      for (const cb of mergeCallbacks) {
        await cb(user.id);
      }
    } catch (err) {
      console.warn('[sync] Error during sync:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAuthenticated: !!user,
        isLoading,
        isSyncing,
        signInWithGoogle,
        signInWithApple,
        signOut,
        syncNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
