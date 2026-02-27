import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import type { Wine } from '@/types/wine';
import { useTranslation } from '@/i18n';
import SearchBar from '@/components/SearchBar';
import WineCard from '@/components/WineCard';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

const DISH_KEYS = [
  'steak', 'pizza', 'sushi', 'poulet', 'bbq', 'poisson',
  'fromage', 'tourtiere', 'poutine', 'pates', 'homard',
  'charcuterie', 'salade', 'agneau', 'dessert',
] as const;

const DISH_EMOJIS: Record<string, string> = {
  steak: '🥩', pizza: '🍕', sushi: '🍣', poulet: '🍗',
  bbq: '🔥', poisson: '🐟', fromage: '🧀', tourtiere: '🥧',
  poutine: '🍟', pates: '🍝', homard: '🦞', charcuterie: '🥓',
  salade: '🥗', agneau: '🐑', dessert: '🍰',
};

export default function PairingScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [dish, setDish] = useState('');
  const [results, setResults] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [activeDish, setActiveDish] = useState<string | null>(null);

  const dishLabels = t.pairing.dishes as Record<string, string>;

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

  const handleDishPress = (key: string) => {
    setActiveDish(key);
    setDish(dishLabels[key] || key);
    searchPairing(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.searchBarWrap}>
          <SearchBar
            value={dish}
            onChangeText={setDish}
            onSubmit={() => searchPairing(dish)}
            placeholder={t.pairing.placeholder}
          />
        </View>
        <Pressable onPress={() => router.push('/menu-scan')} style={styles.menuScanBtn} hitSlop={8}>
          <Ionicons name="camera-outline" size={22} color={COLORS.burgundy} />
        </Pressable>
      </View>

      {!hasSearched && (
        <>
          {/* Menu scan promo */}
          <Pressable onPress={() => router.push('/menu-scan')} style={styles.menuBanner}>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.burgundy} />
            <View style={styles.menuBannerText}>
              <Text style={styles.menuBannerTitle}>{t.menuScan.scanMenu}</Text>
              <Text style={styles.menuBannerSub}>{t.menuScan.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </Pressable>

          <View style={styles.grid}>
            {DISH_KEYS.map((key) => (
              <Pressable
                key={key}
                onPress={() => handleDishPress(key)}
                style={[styles.dishBtn, activeDish === key && styles.dishBtnActive]}
              >
                <Text style={styles.dishEmoji}>{DISH_EMOJIS[key]}</Text>
                <Text style={[styles.dishLabel, activeDish === key && styles.dishLabelActive]}>
                  {dishLabels[key] || key}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {loading && <LoadingState message={t.pairing.loading} />}

      {!loading && hasSearched && results.length === 0 && (
        <EmptyState message={t.pairing.noMatch} submessage={t.pairing.noMatchSub} onRetry={() => { setHasSearched(false); setActiveDish(null); }} />
      )}

      {!loading && results.length > 0 && (
        <>
          <Pressable onPress={() => { setHasSearched(false); setResults([]); setActiveDish(null); }} style={styles.backBtn}>
            <Text style={styles.backText}>{t.pairing.changeDish}</Text>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: SPACING.md,
  },
  searchBarWrap: {
    flex: 1,
  },
  menuScanBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.burgundy + '20',
  },
  menuBannerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  menuBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
  },
  menuBannerSub: {
    fontSize: 12,
    color: COLORS.gray,
    marginTop: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
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
