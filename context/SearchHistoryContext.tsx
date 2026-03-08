import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@saq_fute_search_history';
const MAX_ENTRIES = 20;

export interface SearchHistoryEntry {
  query: string;
  timestamp: number;
  resultCount: number;
}

interface State {
  history: SearchHistoryEntry[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; history: SearchHistoryEntry[] }
  | { type: 'ADD'; entry: SearchHistoryEntry }
  | { type: 'REMOVE'; query: string }
  | { type: 'CLEAR' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { history: action.history, loaded: true };
    case 'ADD': {
      const filtered = state.history.filter((e) => e.query !== action.entry.query);
      return { ...state, history: [action.entry, ...filtered].slice(0, MAX_ENTRIES) };
    }
    case 'REMOVE':
      return { ...state, history: state.history.filter((e) => e.query !== action.query) };
    case 'CLEAR':
      return { ...state, history: [] };
    default:
      return state;
  }
}

interface SearchHistoryContextValue {
  history: SearchHistoryEntry[];
  addEntry: (query: string, resultCount: number) => void;
  removeEntry: (query: string) => void;
  clearHistory: () => void;
}

const SearchHistoryContext = createContext<SearchHistoryContextValue>({
  history: [],
  addEntry: () => {},
  removeEntry: () => {},
  clearHistory: () => {},
});

export function SearchHistoryProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { history: [], loaded: false });

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      dispatch({ type: 'LOAD', history: raw ? JSON.parse(raw) : [] });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
    }
  }, [state.history, state.loaded]);

  const addEntry = useCallback((query: string, resultCount: number) => {
    if (!query.trim()) return;
    dispatch({ type: 'ADD', entry: { query: query.trim(), timestamp: Date.now(), resultCount } });
  }, []);

  const removeEntry = useCallback((query: string) => {
    dispatch({ type: 'REMOVE', query });
  }, []);

  const clearHistory = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value = useMemo(() => ({
    history: state.history,
    addEntry,
    removeEntry,
    clearHistory,
  }), [state.history, addEntry, removeEntry, clearHistory]);

  return (
    <SearchHistoryContext.Provider value={value}>
      {children}
    </SearchHistoryContext.Provider>
  );
}

export function useSearchHistory() {
  return useContext(SearchHistoryContext);
}
