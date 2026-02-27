import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import type { Locale } from '@/i18n';

const STORAGE_KEY = '@saq_fute_settings';

interface Settings {
  language: Locale;
  theme: 'auto' | 'light' | 'dark';
  notifications: boolean;
}

interface SettingsContextValue extends Settings {
  setLanguage: (lang: Locale) => void;
  setTheme: (theme: Settings['theme']) => void;
  setNotifications: (enabled: boolean) => void;
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
};

const SettingsContext = createContext<SettingsContextValue>({
  ...defaults,
  setLanguage: () => {},
  setTheme: () => {},
  setNotifications: () => {},
  loaded: false,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaults);
  const [loaded, setLoaded] = useState(false);

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

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

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

  return (
    <SettingsContext.Provider
      value={{
        ...settings,
        setLanguage,
        setTheme,
        setNotifications,
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
