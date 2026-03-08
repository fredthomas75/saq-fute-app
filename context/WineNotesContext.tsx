import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth, registerMergeCallback } from '@/context/AuthContext';
import { debouncedSync, pushWineNotes, deleteNoteCloud, clearNotesCloud, mergeWineNotes } from '@/services/sync';

const STORAGE_KEY = '@saq_fute_wine_notes';

export interface WineNote {
  wineId: string;
  wineName: string;
  note: string;
  rating?: number; // 1-5
  dateModified: number;
}

interface State {
  notes: WineNote[];
  loaded: boolean;
}

type Action =
  | { type: 'LOAD'; notes: WineNote[] }
  | { type: 'SET_NOTE'; note: WineNote }
  | { type: 'DELETE_NOTE'; wineId: string }
  | { type: 'CLEAR' }
  | { type: 'MERGE'; notes: WineNote[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'LOAD':
      return { notes: action.notes, loaded: true };
    case 'SET_NOTE': {
      const existing = state.notes.findIndex((n) => n.wineId === action.note.wineId);
      if (existing >= 0) {
        const updated = [...state.notes];
        updated[existing] = action.note;
        return { ...state, notes: updated };
      }
      return { ...state, notes: [action.note, ...state.notes] };
    }
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter((n) => n.wineId !== action.wineId) };
    case 'CLEAR':
      return { ...state, notes: [] };
    case 'MERGE':
      return { ...state, notes: action.notes };
    default:
      return state;
  }
}

interface WineNotesContextValue {
  notes: WineNote[];
  setNote: (wineId: string, wineName: string, note: string, rating?: number) => void;
  deleteNote: (wineId: string) => void;
  getNote: (wineId: string) => WineNote | undefined;
  hasNote: (wineId: string) => boolean;
  clearAll: () => void;
}

const WineNotesContext = createContext<WineNotesContextValue>({
  notes: [],
  setNote: () => {},
  deleteNote: () => {},
  getNote: () => undefined,
  hasNote: () => false,
  clearAll: () => {},
});

export function WineNotesProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { notes: [], loaded: false });
  const { user } = useAuth();
  const lastAction = useRef<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      dispatch({ type: 'LOAD', notes: raw ? JSON.parse(raw) : [] });
    });
  }, []);

  useEffect(() => {
    if (state.loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.notes));
    }
  }, [state.notes, state.loaded]);

  // Cloud sync: push changes when authenticated
  useEffect(() => {
    if (state.loaded && user && lastAction.current !== 'MERGE') {
      debouncedSync('wine_notes', () => pushWineNotes(user.id, state.notes));
    }
    lastAction.current = null;
  }, [state.notes, state.loaded, user]);

  // Register merge callback for full sync on login
  useEffect(() => {
    return registerMergeCallback(async (userId) => {
      const merged = await mergeWineNotes(userId, state.notes);
      lastAction.current = 'MERGE';
      dispatch({ type: 'MERGE', notes: merged });
    });
  }, [state.notes]);

  const setNote = useCallback((wineId: string, wineName: string, note: string, rating?: number) => {
    dispatch({
      type: 'SET_NOTE',
      note: { wineId, wineName, note, rating, dateModified: Date.now() },
    });
  }, []);

  const deleteNote = useCallback((wineId: string) => {
    dispatch({ type: 'DELETE_NOTE', wineId });
    if (user) deleteNoteCloud(user.id, wineId).catch(() => {});
  }, [user]);

  const getNote = useCallback(
    (wineId: string) => state.notes.find((n) => n.wineId === wineId),
    [state.notes]
  );

  const hasNote = useCallback(
    (wineId: string) => state.notes.some((n) => n.wineId === wineId),
    [state.notes]
  );

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR' });
    if (user) clearNotesCloud(user.id).catch(() => {});
  }, [user]);

  const value = useMemo(() => ({
    notes: state.notes,
    setNote,
    deleteNote,
    getNote,
    hasNote,
    clearAll,
  }), [state.notes, setNote, deleteNote, getNote, hasNote, clearAll]);

  return (
    <WineNotesContext.Provider value={value}>
      {children}
    </WineNotesContext.Provider>
  );
}

export function useWineNotes() {
  return useContext(WineNotesContext);
}
