import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { useFavorites } from '@/context/FavoritesContext';
import { useWishlist } from '@/context/WishlistContext';
import { useWineNotes } from '@/context/WineNotesContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation } from '@/i18n';
import { hapticLight } from '@/services/haptics';
import type { Wine } from '@/types/wine';

const TYPE_COLORS: Record<string, string> = {
  Rouge: '#722F37',
  Blanc: '#C5A572',
  Rosé: '#E8A0BF',
  Mousseux: '#7FB3D8',
};

const COUNTRY_FLAGS: Record<string, string> = {
  France: '🇫🇷', Italie: '🇮🇹', Espagne: '🇪🇸', Portugal: '🇵🇹',
  Argentine: '🇦🇷', Chili: '🇨🇱', 'États-Unis': '🇺🇸', Australie: '🇦🇺',
  'Nouvelle-Zélande': '🇳🇿', 'Afrique du Sud': '🇿🇦', Allemagne: '🇩🇪',
  Canada: '🇨🇦', Grèce: '🇬🇷', Hongrie: '🇭🇺', Autriche: '🇦🇹',
};

interface Props {
  wine: Wine;
  compact?: boolean;
}

export default function WineCard({ wine, compact }: Props) {
  const router = useRouter();
  const t = useTranslation();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { getNote } = useWineNotes();
  const { showToast } = useToast();
  const fav = isFavorite(wine.id);
  const wished = isInWishlist(wine.id);
  const userNote = getNote(wine.id);

  const handlePress = () => {
    router.push({ pathname: '/wine/[id]', params: { id: wine.id, name: wine.name } });
  };

  const toggleFav = () => {
    hapticLight();
    if (fav) {
      removeFavorite(wine.id);
      showToast(t.toast.favoriteRemoved);
    } else {
      addFavorite(wine);
      showToast(t.toast.favoriteAdded);
    }
  };

  const toggleWish = () => {
    hapticLight();
    if (wished) {
      removeFromWishlist(wine.id);
      showToast(t.toast.wishlistRemoved);
    } else {
      addToWishlist(wine);
      showToast(t.toast.wishlistAdded);
    }
  };

  const flag = COUNTRY_FLAGS[wine.country] || '🍷';
  const typeColor = TYPE_COLORS[wine.type] || COLORS.gray;
  const typeLabel = t.wineTypes[wine.type] || wine.type;

  if (compact) {
    return (
      <Pressable onPress={handlePress} style={styles.compactCard}>
        <Text style={styles.compactName} numberOfLines={2}>{wine.name}</Text>
        <Text style={styles.compactPrice}>{wine.price?.toFixed(2)}$</Text>
        <View style={styles.compactBottom}>
          <View style={[styles.typePill, { backgroundColor: typeColor }]}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>
          {userNote?.rating && userNote.rating > 0 && (
            <View style={styles.compactStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= userNote.rating! ? 'star' : 'star-outline'} size={10} color={s <= userNote.rating! ? COLORS.gold : COLORS.grayLight} />
              ))}
            </View>
          )}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typePill, { backgroundColor: typeColor }]}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>
          {wine.coeurBadge && <Text style={styles.coeurBadge}>❤️</Text>}
          {wine.isOrganic && <Text style={styles.organicBadge}>🌿</Text>}
          {wine.onSale && <Text style={styles.saleBadge}>{t.common.sale}</Text>}
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={toggleWish} hitSlop={8}>
            <Ionicons name={wished ? 'bookmark' : 'bookmark-outline'} size={20} color={wished ? COLORS.gold : COLORS.gray} />
          </Pressable>
          <Pressable onPress={toggleFav} hitSlop={8}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={fav ? COLORS.red : COLORS.gray} />
          </Pressable>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={2}>{wine.name}</Text>

      <View style={styles.meta}>
        <Text style={styles.metaText}>{flag} {wine.country}</Text>
        {wine.appellation && <Text style={styles.metaText} numberOfLines={1}>📍 {wine.appellation}</Text>}
      </View>

      {wine.grapes && wine.grapes.length > 0 && (
        <Text style={styles.grapes} numberOfLines={1}>🍇 {wine.grapes.join(', ')}</Text>
      )}

      {userNote?.rating && userNote.rating > 0 && (
        <View style={styles.userRatingRow}>
          {[1, 2, 3, 4, 5].map((s) => (
            <Ionicons
              key={s}
              name={s <= userNote.rating! ? 'star' : 'star-outline'}
              size={14}
              color={s <= userNote.rating! ? COLORS.gold : COLORS.grayLight}
            />
          ))}
          {userNote.note ? <Ionicons name="chatbubble" size={12} color={COLORS.gray} style={{ marginLeft: 4 }} /> : null}
        </View>
      )}

      <View style={styles.footer}>
        <View style={styles.priceRow}>
          <Text style={styles.price}>{wine.price?.toFixed(2)}$</Text>
          {wine.onSale && wine.originalPrice && (
            <Text style={styles.originalPrice}>{wine.originalPrice.toFixed(2)}$</Text>
          )}
        </View>
        <View style={[styles.dealBadge, { backgroundColor: wine.dealScore >= 95 ? COLORS.gold : wine.dealScore >= 88 ? COLORS.green : COLORS.grayLight }]}>
          <Text style={[styles.dealText, { color: wine.dealScore >= 88 ? COLORS.white : COLORS.grayDark }]}>
            {wine.dealLabel}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginVertical: SPACING.sm,
    ...SHADOWS.card,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  typePillText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  coeurBadge: { fontSize: 14 },
  organicBadge: { fontSize: 14 },
  saleBadge: {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  meta: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  metaText: {
    fontSize: 13,
    color: COLORS.grayDark,
  },
  grapes: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  price: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.burgundy,
  },
  originalPrice: {
    fontSize: 14,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  dealBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  dealText: {
    fontSize: 11,
    fontWeight: '700',
  },
  userRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  // Compact variant
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    width: 150,
    marginRight: SPACING.sm,
    ...SHADOWS.card,
  },
  compactName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SPACING.xs,
    height: 36,
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.burgundy,
    marginBottom: SPACING.xs,
  },
  compactBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compactStars: {
    flexDirection: 'row',
    gap: 1,
  },
});
