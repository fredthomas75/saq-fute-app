import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wine } from '@/types/wine';

const STORAGE_KEY = '@saq_fute_recently_viewed';
const MAX_ENTRIES = 20;

export type RecentWine = Pick<Wine, 'id' | 'name' | 'price' | 'type' | 'country' | 'onSale' | 'originalPrice' | 'coeurBadge' | 'isOrganic' | 'appellation' | 'grapes' | 'dealScore' | 'saqUrl' | 'maxExpertScore'>;

interface State {
  wines: RecentWine[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; wines: RecentWine[] }
  | { type: 'ADD'; wine: RecentWine }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { wines: action.wines, loaded: true };
    case 'ADD': {
      const filtered = state.wines.filter((w) => w.id !== action.wine.id);
      return { ...state, wines: [action.wine, ...filtered].slice(0, MAX_ENTRIES) };
    }
    case 'CLEAR':
      return { ...state, wines: [] };
    default:
      return state;
  }
}

interface RecentlyViewedContextValue {
  recentWines: RecentWine[];
  addViewed: (wine: Wine) => void;
  clearRecent: () => void;
}

const RecentlyViewedContext = createContext<RecentlyViewedContextValue>({
  recentWines: [],
  addViewed: () => {},
  clearRecent: () => {},
});

export function RecentlyViewedProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { wines: [], loaded: false });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      dispatch({ type: 'LOAD', wines: raw ? JSON.parse(raw) : [] });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.wines));
    }
  }, [state.wines, state.loaded]);

  const addViewed = useCallback((wine: Wine) => {
    const { id, name, price, type, country, onSale, originalPrice, coeurBadge, isOrganic, appellation, grapes, dealScore, saqUrl, maxExpertScore } = wine;
    dispatch({ type: 'ADD', wine: { id, name, price, type, country, onSale, originalPrice, coeurBadge, isOrganic, appellation, grapes, dealScore, saqUrl, maxExpertScore } });
  }, []);

  const clearRecent = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value = useMemo(() => ({
    recentWines: state.wines,
    addViewed,
    clearRecent,
  }), [state.wines, addViewed, clearRecent]);

  return (
    <RecentlyViewedContext.Provider value={value}>
      {children}
    </RecentlyViewedContext.Provider>
  );
}

export function useRecentlyViewed() {
  return useContext(RecentlyViewedContext);
}
