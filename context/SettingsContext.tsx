import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { Locale } from '@/i18n';
import { supabase } from '@/services/supabase';
import { debouncedSync, pushSettings, mergeSettings } from '@/services/sync';

const STORAGE_KEY = '@saq_fute_settings';

interface Settings {
  language: Locale;
  theme: 'auto' | 'light' | 'dark';
  notifications: boolean;
  vipMode: boolean;
}

interface SettingsContextValue extends Settings {
  setLanguage: (lang: Locale) => void;
  setTheme: (theme: Settings['theme']) => void;
  setNotifications: (enabled: boolean) => void;
  toggleVipMode: () => void;
  loaded: boolean;
}

const defaultLanguage = (): Locale => {
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === 'en' ? 'en' : 'fr';
};

const defaults: Settings = {
  language: defaultLanguage(),
  theme: 'auto',
  notifications: true,
  vipMode: false,
};

const SettingsContext = createContext<SettingsContextValue>({
  ...defaults,
  setLanguage: () => {},
  setTheme: () => {},
  setNotifications: () => {},
  toggleVipMode: () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) {
        try {
          const saved = JSON.parse(raw) as Partial<Settings>;
          setSettings((prev) => ({ ...prev, ...saved }));
        } catch {}
      }
      setLoaded(true);
    });
  }, []);

  // Listen to auth state directly (SettingsProvider is above AuthProvider)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Sync settings on auth change (initial merge)
  useEffect(() => {
    if (loaded && userId) {
      mergeSettings(userId, settings).then((merged) => {
        setSettings(merged as Settings);
        AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, loaded]);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    // Push to cloud if authenticated
    if (userId) {
      debouncedSync('settings', () => pushSettings(userId, next));
    }
  }, [userId]);

  const setLanguage = useCallback(
    (language: Locale) => persist({ ...settings, language }),
    [settings, persist]
  );

  const setTheme = useCallback(
    (theme: Settings['theme']) => persist({ ...settings, theme }),
    [settings, persist]
  );

  const setNotifications = useCallback(
    (notifications: boolean) => persist({ ...settings, notifications }),
    [settings, persist]
  );

  const toggleVipMode = useCallback(
    () => persist({ ...settings, vipMode: !settings.vipMode }),
    [settings, persist]
  );

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setLanguage,
        setTheme,
        setNotifications,
        toggleVipMode,
        loaded,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
