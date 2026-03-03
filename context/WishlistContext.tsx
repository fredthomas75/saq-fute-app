import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wine } from '@/types/wine';
import { useAuth, registerMergeCallback } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { debouncedSync, pushWishlist, deleteWishlistCloud, clearWishlistCloud, mergeWishlist } from '@/services/sync';

const STORAGE_KEY = '@saq_fute_wishlist';

type WishlistWine = Pick<Wine, 'id' | 'name' | 'type' | 'price' | 'country' | 'dealScore' | 'dealLabel' | 'saqUrl'> & {
  grapes?: string[];
  appellation?: string | null;
  region?: string;
  isOrganic?: boolean;
  onSale?: boolean;
  coeurBadge?: string | null;
  dateAdded: number;
};

interface State {
  wishlist: WishlistWine[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; wishlist: WishlistWine[] }
  | { type: 'ADD'; wine: WishlistWine }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' }
  | { type: 'MERGE'; wishlist: WishlistWine[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { wishlist: action.wishlist, loaded: true };
    case 'ADD':
      if (state.wishlist.some((w) => w.id === action.wine.id)) return state;
      return { ...state, wishlist: [action.wine, ...state.wishlist] };
    case 'REMOVE':
      return { ...state, wishlist: state.wishlist.filter((w) => w.id !== action.id) };
    case 'CLEAR':
      return { ...state, wishlist: [] };
    case 'MERGE':
      return { ...state, wishlist: action.wishlist };
    default:
      return state;
  }
}

interface WishlistContextValue {
  wishlist: WishlistWine[];
  addToWishlist: (wine: Wine) => void;
  removeFromWishlist: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  clearAll: () => void;
}

const WishlistContext = createContext<WishlistContextValue>({
  wishlist: [],
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  isInWishlist: () => false,
  clearAll: () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { wishlist: [], loaded: false });
  const { user } = useAuth();
  const { showToast } = useToast();
  const lastAction = useRef<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      dispatch({ type: 'LOAD', wishlist: raw ? JSON.parse(raw) : [] });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.wishlist));
    }
  }, [state.wishlist, state.loaded]);

  // Cloud sync: push changes when authenticated
  useEffect(() => {
    if (state.loaded && user && lastAction.current !== 'MERGE') {
      debouncedSync('wishlist', () => pushWishlist(user.id, state.wishlist as any), 500, () => {
        showToast('⚠️ Sync wishlist échouée');
      });
    }
    lastAction.current = null;
  }, [state.wishlist, state.loaded, user, showToast]);

  // Register merge callback for full sync on login
  useEffect(() => {
    return registerMergeCallback(async (userId) => {
      const merged = await mergeWishlist(userId, state.wishlist as any);
      lastAction.current = 'MERGE';
      dispatch({ type: 'MERGE', wishlist: merged as any });
    });
  }, [state.wishlist]);

  const addToWishlist = useCallback((wine: Wine) => {
    const item: WishlistWine = {
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
      dateAdded: Date.now(),
    };
    dispatch({ type: 'ADD', wine: item });
  }, []);

  const removeFromWishlist = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
    if (user) deleteWishlistCloud(user.id, id).catch(() => {});
  }, [user]);

  const isInWishlist = useCallback(
    (id: string) => state.wishlist.some((w) => w.id === id),
    [state.wishlist]
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    if (user) clearWishlistCloud(user.id).catch(() => {});
  }, [user]);

  return (
    <WishlistContext.Provider value={{ wishlist: state.wishlist, addToWishlist, removeFromWishlist, isInWishlist, clearAll }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
