import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saq_fute_taste_profile';

export interface TasteProfile {
  preferredTypes: string[];
  sweetness: 'dry' | 'off-dry' | 'sweet';
  body: 'light' | 'medium' | 'full';
  budgetMax: number;
  foodPreferences: string[];
  completed: boolean;
  completedAt?: number;
}

interface TasteProfileContextValue {
  profile: TasteProfile | null;
  saveProfile: (profile: TasteProfile) => void;
  clearProfile: () => void;
}

const TasteProfileContext = createContext<TasteProfileContextValue>({
  profile: null,
  saveProfile: () => {},
  clearProfile: () => {},
});

export function TasteProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<TasteProfile | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (raw) setProfile(JSON.parse(raw));
    });
  }, []);

  const saveProfile = useCallback((p: TasteProfile) => {
    const withTimestamp = { ...p, completed: true, completedAt: Date.now() };
    setProfile(withTimestamp);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(withTimestamp));
  }, []);

  const clearProfile = useCallback(() => {
    setProfile(null);
    AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <TasteProfileContext.Provider value={{ profile, saveProfile, clearProfile }}>
      {children}
    </TasteProfileContext.Provider>
  );
}

export function useTasteProfile() {
  return useContext(TasteProfileContext);
}
