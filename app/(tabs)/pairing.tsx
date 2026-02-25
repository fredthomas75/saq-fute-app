import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import SearchBar from '@/components/SearchBar';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

const DISHES = [
  { key: 'steak', emoji: '🥩', label: 'Steak' },
  { key: 'pizza', emoji: '🍕', label: 'Pizza' },
  { key: 'sushi', emoji: '🍣', label: 'Sushi' },
  { key: 'poulet', emoji: '🍗', label: 'Poulet' },
  { key: 'bbq', emoji: '🔥', label: 'BBQ' },
  { key: 'poisson', emoji: '🐟', label: 'Poisson' },
  { key: 'fromage', emoji: '🧀', label: 'Fromage' },
  { key: 'tourtiere', emoji: '🥧', label: 'Tourtière' },
  { key: 'poutine', emoji: '🍟', label: 'Poutine' },
  { key: 'pates', emoji: '🍝', label: 'Pâtes' },
  { key: 'homard', emoji: '🦞', label: 'Homard' },
  { key: 'charcuterie', emoji: '🥓', label: 'Charcuterie' },
  { key: 'salade', emoji: '🥗', label: 'Salade' },
  { key: 'agneau', emoji: '🐑', label: 'Agneau' },
  { key: 'dessert', emoji: '🍰', label: 'Dessert' },
];

export default function PairingScreen() {
  const [dish, setDish] = useState('');
  const [results, setResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeDish, setActiveDish] = useState<string | null>(null);

  const searchPairing = useCallback(async (d: string) => {
    if (!d) return;
    setDish(d);
    setLoading(true);
    setHasSearched(true);
    try {
      const data = await saqApi.pairing({ dish: d });
      setResults(data.wines);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDishPress = (d: typeof DISHES[0]) => {
    setActiveDish(d.key);
    setDish(d.label);
    searchPairing(d.key);
  };

  return (
    <View style={styles.container}>
      <SearchBar
        value={dish}
        onChangeText={setDish}
        onSubmit={() => searchPairing(dish)}
        placeholder="Que mangez-vous ce soir ?"
      />

      {!hasSearched && (
        <View style={styles.grid}>
          {DISHES.map((d) => (
            <Pressable
              key={d.key}
              onPress={() => handleDishPress(d)}
              style={[styles.dishBtn, activeDish === d.key && styles.dishBtnActive]}
            >
              <Text style={styles.dishEmoji}>{d.emoji}</Text>
              <Text style={[styles.dishLabel, activeDish === d.key && styles.dishLabelActive]}>{d.label}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {loading && <LoadingState message="Recherche d'accords..." />}

      {!loading && hasSearched && results.length === 0 && (
        <EmptyState message="Aucun accord trouvé" submessage="Essaie un autre plat" onRetry={() => { setHasSearched(false); setActiveDish(null); }} />
      )}

      {!loading && results.length > 0 && (
        <>
          <Pressable onPress={() => { setHasSearched(false); setResults([]); setActiveDish(null); }} style={styles.backBtn}>
            <Text style={styles.backText}>← Changer de plat</Text>
          </Pressable>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <WineCard wine={item} />}
            contentContainerStyle={styles.list}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  dishBtn: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.card,
  },
  dishBtnActive: { backgroundColor: COLORS.burgundy },
  dishEmoji: { fontSize: 32, marginBottom: SPACING.xs },
  dishLabel: { fontSize: 13, fontWeight: '600', color: COLORS.grayDark },
  dishLabelActive: { color: COLORS.white },
  backBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backText: { color: COLORS.burgundy, fontWeight: '600', fontSize: 15 },
  list: { paddingBottom: SPACING.xl },
});
