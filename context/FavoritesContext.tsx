import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wine } from '@/types/wine';

const STORAGE_KEY = '@saq_fute_favorites';

type FavWine = Pick<Wine, 'id' | 'name' | 'type' | 'price' | 'country' | 'dealScore' | 'dealLabel' | 'saqUrl'> & {
  grapes?: string[];
  appellation?: string | null;
  region?: string;
  isOrganic?: boolean;
  onSale?: boolean;
  coeurBadge?: string | null;
};

interface FavState {
  favorites: FavWine[];
  loaded: boolean;
}

type FavAction =
  | { type: 'LOAD'; favorites: FavWine[] }
  | { type: 'ADD'; wine: FavWine }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' };

function reducer(state: FavState, action: FavAction): FavState {
  switch (action.type) {
    case 'LOAD':
      return { favorites: action.favorites, loaded: true };
    case 'ADD':
      if (state.favorites.some((w) => w.id === action.wine.id)) return state;
      return { ...state, favorites: [action.wine, ...state.favorites] };
    case 'REMOVE':
      return { ...state, favorites: state.favorites.filter((w) => w.id !== action.id) };
    case 'CLEAR':
      return { ...state, favorites: [] };
    default:
      return state;
  }
}

interface FavContextValue {
  favorites: FavWine[];
  addFavorite: (wine: Wine) => void;
  removeFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  clearAll: () => void;
}

const FavoritesContext = createContext<FavContextValue>({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
  isFavorite: () => false,
  clearAll: () => {},
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { favorites: [], loaded: false });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      const favorites = raw ? JSON.parse(raw) : [];
      dispatch({ type: 'LOAD', favorites });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.favorites));
    }
  }, [state.favorites, state.loaded]);

  const addFavorite = useCallback((wine: Wine) => {
    const fav: FavWine = {
      id: wine.id,
      name: wine.name,
      type: wine.type,
      price: wine.price,
      country: wine.country,
      dealScore: wine.dealScore,
      dealLabel: wine.dealLabel,
      saqUrl: wine.saqUrl,
      grapes: wine.grapes,
      appellation: wine.appellation,
      region: wine.region,
      isOrganic: wine.isOrganic,
      onSale: wine.onSale,
      coeurBadge: wine.coeurBadge,
    };
    dispatch({ type: 'ADD', wine: fav });
  }, []);

  const removeFavorite = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const isFavorite = useCallback(
    (id: string) => state.favorites.some((w) => w.id === id),
    [state.favorites]
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  return (
    <FavoritesContext.Provider value={{ favorites: state.favorites, addFavorite, removeFavorite, isFavorite, clearAll }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
