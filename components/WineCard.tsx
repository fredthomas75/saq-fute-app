import React from 'react';
import { View, Text, Pressable, Share, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { TYPE_COLORS, COUNTRY_FLAGS } from '@/constants/wine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useFavorites } from '@/context/FavoritesContext';
import { useWishlist } from '@/context/WishlistContext';
import { useWineNotes } from '@/context/WineNotesContext';
import { useToast } from '@/context/ToastContext';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { hapticLight } from '@/services/haptics';
import type { Wine } from '@/types/wine';
import DealBadge from '@/components/DealBadge';

interface Props {
  wine: Wine;
  compact?: boolean;
}

function WineCard({ wine, compact }: Props) {
  const router = useRouter();
  const segments = useSegments();
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { getNote } = useWineNotes();
  const { showToast } = useToast();
  const fav = isFavorite(wine.id);
  const wished = isInWishlist(wine.id);
  const userNote = getNote(wine.id);

  const handlePress = () => {
    // Navigate within (home) group to keep tab bar visible, fallback to root
    const inHomeTab = segments.includes('(home)' as never);
    if (inHomeTab) {
      router.push({ pathname: '/(home)/wine/[id]' as any, params: { id: wine.id, name: wine.name } });
    } else {
      router.push({ pathname: '/wine/[id]', params: { id: wine.id, name: wine.name } });
    }
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

  const handleShare = async () => {
    try {
      await Share.share({ message: `🍷 ${wine.name}\n💰 ${wine.price?.toFixed(2)}$\n🔗 ${wine.saqUrl}` });
    } catch (_) {}
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
      <Pressable onPress={handlePress} style={[styles.compactCard, { backgroundColor: colors.white }]}>
        {/* Color accent bar */}
        <View style={[styles.compactAccent, { backgroundColor: typeColor }]} />

        <View style={styles.compactInner}>
          {/* Top row: type + badges */}
          <View style={styles.compactTopRow}>
            <View style={[styles.typePill, { backgroundColor: typeColor }]}>
              <Text style={styles.typePillText}>{typeLabel}</Text>
            </View>
            {wine.onSale && <Text style={styles.compactSaleBadge}>{t.common.sale}</Text>}
            {wine.coeurBadge && <Text style={{ fontSize: 12 }}>❤️</Text>}
            {wine.maxExpertScore && wine.maxExpertScore >= 90 && (
              <View style={styles.expertBadgeCompact}>
                <Text style={styles.expertBadgeCompactText}>{wine.maxExpertScore}</Text>
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={[styles.compactName, { color: colors.black }]} numberOfLines={2}>{wine.name}</Text>

          {/* Country */}
          <Text style={styles.compactCountry} numberOfLines={1}>{flag} {tc(wine.country)}</Text>

          {/* User rating */}
          {userNote?.rating && userNote.rating > 0 && (
            <View style={styles.compactStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Ionicons key={s} name={s <= userNote.rating! ? 'star' : 'star-outline'} size={10} color={s <= userNote.rating! ? COLORS.gold : COLORS.grayLight} />
              ))}
            </View>
          )}

          {/* Price row */}
          <View style={styles.compactPriceRow}>
            <Text style={[styles.compactPrice, { color: colors.burgundy }]}>{wine.price?.toFixed(2)}$</Text>
            {wine.onSale && wine.originalPrice && (
              <Text style={styles.compactOriginalPrice}>{wine.originalPrice.toFixed(2)}$</Text>
            )}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={handlePress} style={[styles.card, { backgroundColor: colors.white }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typePill, { backgroundColor: typeColor }]}>
            <Text style={styles.typePillText}>{typeLabel}</Text>
          </View>
          {wine.coeurBadge && <Text style={styles.coeurBadge}>❤️</Text>}
          {wine.isOrganic && <Text style={styles.organicBadge}>🌿</Text>}
          {wine.onSale && <Text style={styles.saleBadge}>{t.common.sale}</Text>}
          {wine.maxExpertScore && wine.maxExpertScore >= 90 && (
            <View style={styles.expertBadge}>
              <Ionicons name="star" size={10} color={COLORS.white} />
              <Text style={styles.expertBadgeText}>{wine.maxExpertScore}</Text>
            </View>
          )}
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShare} hitSlop={8} accessibilityLabel={t.wineDetail.share} accessibilityRole="button">
            <Ionicons name="share-outline" size={18} color={COLORS.gray} />
          </Pressable>
          <Pressable onPress={toggleWish} hitSlop={8} accessibilityLabel={wished ? t.wishlist.inList : t.wishlist.add} accessibilityRole="button" accessibilityState={{ selected: wished }}>
            <Ionicons name={wished ? 'bookmark' : 'bookmark-outline'} size={20} color={wished ? COLORS.gold : COLORS.gray} />
          </Pressable>
          <Pressable onPress={toggleFav} hitSlop={8} accessibilityLabel={fav ? t.wineDetail.remove : t.wineDetail.favorite} accessibilityRole="button" accessibilityState={{ selected: fav }}>
            <Ionicons name={fav ? 'heart' : 'heart-outline'} size={24} color={fav ? COLORS.red : COLORS.gray} />
          </Pressable>
        </View>
      </View>

      <Text style={[styles.name, { color: colors.black }]} numberOfLines={2}>{wine.name}</Text>

      <View style={styles.meta}>
        <Text style={[styles.metaText, { color: colors.gray }]}>{flag} {tc(wine.country)}</Text>
        {wine.appellation && <Text style={[styles.metaText, { color: colors.gray }]} numberOfLines={1}>📍 {wine.appellation}</Text>}
      </View>

      {wine.grapes && wine.grapes.length > 0 && (
        <Text style={[styles.grapes, { color: colors.gray }]} numberOfLines={1}>🍇 {wine.grapes.join(', ')}</Text>
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
          <Text style={[styles.price, { color: colors.burgundy }]}>{wine.price?.toFixed(2)}$</Text>
          {wine.onSale && wine.originalPrice && (
            <Text style={styles.originalPrice}>{wine.originalPrice.toFixed(2)}$</Text>
          )}
        </View>
        <DealBadge dealScore={wine.dealScore} />
      </View>
    </Pressable>
  );
}

export default React.memo(WineCard);

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
  userRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  // Compact variant
  compactCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    width: 185,
    marginRight: SPACING.sm,
    overflow: 'hidden',
    ...SHADOWS.card,
  },
  compactAccent: {
    height: 4,
    width: '100%',
  },
  compactInner: {
    padding: SPACING.sm,
    paddingTop: SPACING.xs + 2,
    gap: 4,
  },
  compactTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  compactSaleBadge: {
    backgroundColor: COLORS.red,
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '700',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  compactName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
    lineHeight: 17,
    minHeight: 34,
  },
  compactCountry: {
    fontSize: 11,
    color: COLORS.gray,
  },
  compactPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  compactPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.burgundy,
  },
  compactOriginalPrice: {
    fontSize: 12,
    color: COLORS.gray,
    textDecorationLine: 'line-through',
  },
  compactStars: {
    flexDirection: 'row',
    gap: 1,
  },
  expertBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  expertBadgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  expertBadgeCompact: {
    backgroundColor: COLORS.gold,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: RADIUS.sm,
  },
  expertBadgeCompactText: {
    color: COLORS.white,
    fontSize: 9,
    fontWeight: '800',
  },
});
