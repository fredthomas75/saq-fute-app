import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, ScrollView, Pressable, StyleSheet } from 'react-native';
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

// Categories with their dish keys
const CATEGORIES = [
  'populaires', 'quebecois', 'viandes', 'mer', 'monde', 'autres',
] as const;

const CATEGORY_DISHES: Record<string, string[]> = {
  populaires: ['steak', 'pizza', 'poulet', 'pates', 'bbq', 'sushi'],
  quebecois: ['tourtiere', 'poutine', 'cipaille', 'pate_chinois', 'creton', 'ragout', 'smoked_meat', 'tarte_sucre'],
  viandes: ['agneau', 'porc', 'canard', 'gibier', 'veau'],
  mer: ['homard', 'poisson', 'saumon', 'crevettes', 'moules', 'huitres'],
  monde: ['thai', 'indien', 'mexicain', 'marocain', 'japonais', 'libanais'],
  autres: ['fromage', 'charcuterie', 'salade', 'fondue', 'risotto', 'dessert'],
};

const ALL_DISH_KEYS = Object.values(CATEGORY_DISHES).flat();

const DISH_EMOJIS: Record<string, string> = {
  steak: '🥩', pizza: '🍕', sushi: '🍣', poulet: '🍗',
  bbq: '🔥', poisson: '🐟', fromage: '🧀', tourtiere: '🥧',
  poutine: '🍟', pates: '🍝', homard: '🦞', charcuterie: '🥓',
  salade: '🥗', agneau: '🐑', dessert: '🍰', cipaille: '🫕',
  pate_chinois: '🥘', creton: '🧈', ragout: '🍲', smoked_meat: '🥪',
  tarte_sucre: '🥧', porc: '🐖', canard: '🦆', gibier: '🦌',
  veau: '🥩', saumon: '🐟', crevettes: '🦐', moules: '🦪',
  huitres: '🦪', thai: '🍜', indien: '🍛', mexicain: '🌮',
  marocain: '🫕', japonais: '🍱', libanais: '🧆', fondue: '🫕',
  risotto: '🍚',
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
  const categoryLabels = t.pairing.categories as Record<string, string>;

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
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Menu scan promo */}
          <Pressable onPress={() => router.push('/menu-scan')} style={styles.menuBanner}>
            <Ionicons name="restaurant-outline" size={20} color={COLORS.burgundy} />
            <View style={styles.menuBannerText}>
              <Text style={styles.menuBannerTitle}>{t.menuScan.scanMenu}</Text>
              <Text style={styles.menuBannerSub}>{t.menuScan.title}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.gray} />
          </Pressable>

          {CATEGORIES.map((cat) => (
            <View key={cat} style={styles.categorySection}>
              <Text style={styles.categoryTitle}>{categoryLabels[cat] || cat}</Text>
              <View style={styles.grid}>
                {CATEGORY_DISHES[cat].map((key) => (
                  <Pressable
                    key={key}
                    onPress={() => handleDishPress(key)}
                    style={[styles.dishBtn, activeDish === key && styles.dishBtnActive]}
                  >
                    <Text style={styles.dishEmoji}>{DISH_EMOJIS[key] || '🍽️'}</Text>
                    <Text
                      style={[styles.dishLabel, activeDish === key && styles.dishLabelActive]}
                      numberOfLines={1}
                    >
                      {dishLabels[key] || key}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
          <View style={{ height: SPACING.xl }} />
        </ScrollView>
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
  scrollContent: { paddingBottom: SPACING.xl },
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
    marginBottom: SPACING.md,
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
  categorySection: {
    marginBottom: SPACING.md,
  },
  categoryTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.black,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  dishBtn: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  dishBtnActive: { backgroundColor: COLORS.burgundy, borderColor: COLORS.burgundy },
  dishEmoji: { fontSize: 18 },
  dishLabel: { fontSize: 13, fontWeight: '600', color: COLORS.grayDark },
  dishLabelActive: { color: COLORS.white },
  backBtn: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  backText: { color: COLORS.burgundy, fontWeight: '600', fontSize: 15 },
  list: { paddingBottom: SPACING.xl },
});
