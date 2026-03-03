import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Wine } from '@/types/wine';
import { useAuth, registerMergeCallback } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { debouncedSync, pushCellar, deleteCellarCloud, clearCellarCloud, mergeCellar } from '@/services/sync';

const STORAGE_KEY = '@saq_fute_cellar';

export interface CellarWine {
  wineId: string;
  name: string;
  type: Wine['type'];
  price: number;
  country: string;
  quantity: number;
  dateAdded: number;
  notes?: string;
}

interface State {
  cellar: CellarWine[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; cellar: CellarWine[] }
  | { type: 'ADD'; wine: CellarWine }
  | { type: 'REMOVE'; wineId: string }
  | { type: 'UPDATE_QTY'; wineId: string; quantity: number }
  | { type: 'UPDATE_NOTES'; wineId: string; notes: string }
  | { type: 'CLEAR' }
  | { type: 'MERGE'; cellar: CellarWine[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { cellar: action.cellar, loaded: true };
    case 'ADD': {
      const qty = action.wine.quantity || 1;
      const existing = state.cellar.find((w) => w.wineId === action.wine.wineId);
      if (existing) {
        return {
          ...state,
          cellar: state.cellar.map((w) =>
            w.wineId === action.wine.wineId ? { ...w, quantity: w.quantity + qty } : w
          ),
        };
      }
      return { ...state, cellar: [action.wine, ...state.cellar] };
    }
    case 'REMOVE':
      return { ...state, cellar: state.cellar.filter((w) => w.wineId !== action.wineId) };
    case 'UPDATE_QTY': {
      if (action.quantity <= 0) {
        return { ...state, cellar: state.cellar.filter((w) => w.wineId !== action.wineId) };
      }
      return {
        ...state,
        cellar: state.cellar.map((w) =>
          w.wineId === action.wineId ? { ...w, quantity: action.quantity } : w
        ),
      };
    }
    case 'UPDATE_NOTES':
      return {
        ...state,
        cellar: state.cellar.map((w) =>
          w.wineId === action.wineId ? { ...w, notes: action.notes } : w
        ),
      };
    case 'CLEAR':
      return { ...state, cellar: [] };
    case 'MERGE':
      return { ...state, cellar: action.cellar };
    default:
      return state;
  }
}

interface CellarContextValue {
  cellar: CellarWine[];
  addToCellar: (wine: Wine, quantity?: number) => void;
  removeFromCellar: (wineId: string) => void;
  updateQuantity: (wineId: string, quantity: number) => void;
  updateNotes: (wineId: string, notes: string) => void;
  isInCellar: (wineId: string) => boolean;
  getCellarQuantity: (wineId: string) => number;
  totalBottles: number;
  totalValue: number;
  clearCellar: () => void;
}

const CellarContext = createContext<CellarContextValue>({
  cellar: [],
  addToCellar: () => {},
  removeFromCellar: () => {},
  updateQuantity: () => {},
  updateNotes: () => {},
  isInCellar: () => false,
  getCellarQuantity: () => 0,
  totalBottles: 0,
  totalValue: 0,
  clearCellar: () => {},
});

export function CellarProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { cellar: [], loaded: false });
  const { user } = useAuth();
  const { showToast } = useToast();
  const lastAction = useRef<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      dispatch({ type: 'LOAD', cellar: raw ? JSON.parse(raw) : [] });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.cellar));
    }
  }, [state.cellar, state.loaded]);

  // Cloud sync: push changes when authenticated
  useEffect(() => {
    if (state.loaded && user && lastAction.current !== 'MERGE') {
      debouncedSync('cellar', () => pushCellar(user.id, state.cellar), 500, () => {
        showToast('⚠️ Sync cave échouée');
      });
    }
    lastAction.current = null;
  }, [state.cellar, state.loaded, user, showToast]);

  // Register merge callback for full sync on login
  useEffect(() => {
    return registerMergeCallback(async (userId) => {
      const merged = await mergeCellar(userId, state.cellar);
      lastAction.current = 'MERGE';
      dispatch({ type: 'MERGE', cellar: merged });
    });
  }, [state.cellar]);

  const addToCellar = useCallback((wine: Wine, quantity: number = 1) => {
    dispatch({
      type: 'ADD',
      wine: {
        wineId: wine.id,
        name: wine.name,
        type: wine.type,
        price: wine.price,
        country: wine.country,
        quantity,
        dateAdded: Date.now(),
      },
    });
  }, []);

  const removeFromCellar = useCallback((wineId: string) => {
    dispatch({ type: 'REMOVE', wineId });
    if (user) deleteCellarCloud(user.id, wineId).catch(() => {});
  }, [user]);

  const updateQuantity = useCallback((wineId: string, quantity: number) => {
    dispatch({ type: 'UPDATE_QTY', wineId, quantity });
  }, []);

  const updateNotes = useCallback((wineId: string, notes: string) => {
    dispatch({ type: 'UPDATE_NOTES', wineId, notes });
  }, []);

  const isInCellar = useCallback(
    (wineId: string) => state.cellar.some((w) => w.wineId === wineId),
    [state.cellar]
  );

  const getCellarQuantity = useCallback(
    (wineId: string) => state.cellar.find((w) => w.wineId === wineId)?.quantity || 0,
    [state.cellar]
  );

  const totalBottles = useMemo(
    () => state.cellar.reduce((sum, w) => sum + w.quantity, 0),
    [state.cellar]
  );

  const totalValue = useMemo(
    () => state.cellar.reduce((sum, w) => sum + w.price * w.quantity, 0),
    [state.cellar]
  );

  const clearCellar = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    if (user) clearCellarCloud(user.id).catch(() => {});
  }, [user]);

  return (
    <CellarContext.Provider
      value={{
        cellar: state.cellar,
        addToCellar,
        removeFromCellar,
        updateQuantity,
        updateNotes,
        isInCellar,
        getCellarQuantity,
        totalBottles,
        totalValue,
        clearCellar,
      }}
    >
      {children}
    </CellarContext.Provider>
  );
}

export function useCellar() {
  return useContext(CellarContext);
}
