import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Share, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { useFavorites } from '@/context/FavoritesContext';
import { useCellar } from '@/context/CellarContext';
import { useTranslation } from '@/i18n';
import type { Wine } from '@/types/wine';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

export default function WineDetailScreen() {
  const t = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInCellar, addToCellar } = useCellar();
  const [wine, setWine] = useState<Wine | null>(null);
  const [conseil, setConseil] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    saqApi.advice(id).then((data) => {
      setWine(data.wine);
      setConseil(data.conseil);
    }).catch((err) => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState message={t.wineDetail.loading} />;
  if (error || !wine) return <EmptyState icon="alert-circle-outline" message={t.wineDetail.notFound} submessage={error || ''} />;

  const fav = isFavorite(wine.id);
  const inCellar = isInCellar(wine.id);

  const handleShare = async () => {
    const dealInfo = wine.onSale && wine.dealLabel ? ` (${wine.dealLabel})` : '';
    await Share.share({
      message: `🍷 ${wine.name}\n💰 ${wine.price?.toFixed(2)}$${dealInfo}\n🔗 ${wine.saqUrl}`,
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header badges */}
      <View style={styles.badges}>
        <View style={[styles.typePill, { backgroundColor: wine.type === 'Rouge' ? '#722F37' : wine.type === 'Blanc' ? '#C5A572' : wine.type === 'Rosé' ? '#E8A0BF' : '#7FB3D8' }]}>
          <Text style={styles.typePillText}>{wine.type}</Text>
        </View>
        {wine.isOrganic && <Text style={styles.badge}>{t.wineDetail.bio}</Text>}
        {wine.coeurBadge && <Text style={styles.badge}>{t.wineDetail.coupDeCoeur}</Text>}
        {wine.onSale && <Text style={[styles.badge, { backgroundColor: COLORS.red }]}>{t.wineDetail.promo}</Text>}
      </View>

      <Text style={styles.name}>{wine.name}</Text>
      <Text style={styles.appellation}>{wine.appellation}</Text>

      {/* Price + Deal */}
      <View style={styles.priceRow}>
        <Text style={styles.price}>{wine.price?.toFixed(2)}$</Text>
        {wine.onSale && wine.originalPrice && (
          <Text style={styles.origPrice}>{wine.originalPrice.toFixed(2)}$</Text>
        )}
        <View style={styles.dealBadge}>
          <Text style={styles.dealText}>{wine.dealLabel}</Text>
        </View>
      </View>

      {/* Info grid */}
      <View style={styles.infoCard}>
        {wine.country && <InfoRow icon="globe-outline" label={t.wineDetail.country} value={wine.country} />}
        {wine.region && <InfoRow icon="location-outline" label={t.wineDetail.region} value={wine.region} />}
        {wine.grapes && wine.grapes.length > 0 && <InfoRow icon="leaf-outline" label={t.wineDetail.grapes} value={wine.grapes.join(', ')} />}
        {wine.tasteProfile && <InfoRow icon="color-palette-outline" label={t.wineDetail.profile} value={wine.tasteProfile} />}
      </View>

      {/* Description */}
      {wine.description && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.wineDetail.description}</Text>
          <Text style={styles.description}>{wine.description}</Text>
        </View>
      )}

      {/* Conseil de service */}
      {conseil && (
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>{t.wineDetail.advice}</Text>
          {conseil.service && <InfoRow icon="thermometer-outline" label={t.wineDetail.service} value={conseil.service} />}
          {conseil.carafage && <InfoRow icon="time-outline" label={t.wineDetail.decanting} value={conseil.carafage} />}
          {conseil.conservation && <InfoRow icon="calendar-outline" label={t.wineDetail.conservation} value={conseil.conservation} />}
        </View>
      )}

      {/* Food pairing */}
      {wine.foodPairing && wine.foodPairing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.wineDetail.pairings}</Text>
          <View style={styles.pairingRow}>
            {wine.foodPairing.map((f, i) => (
              <View key={i} style={styles.pairingChip}>
                <Text style={styles.pairingText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expert ratings */}
      {wine.expertRatings && wine.expertRatings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t.wineDetail.expertRatings}</Text>
          {wine.expertRatings.map((r, i) => (
            <Text key={i} style={styles.expertRating}>{r.source}: {r.score}/100</Text>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={() => fav ? removeFavorite(wine.id) : addFavorite(wine)} style={[styles.actionBtn, styles.favBtn]}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? COLORS.red : COLORS.burgundy} />
          <Text style={styles.actionText}>{fav ? t.wineDetail.remove : t.wineDetail.favorite}</Text>
        </Pressable>

        <Pressable onPress={() => Linking.openURL(wine.saqUrl)} style={[styles.actionBtn, styles.buyBtn]}>
          <Ionicons name="cart-outline" size={20} color={COLORS.white} />
          <Text style={[styles.actionText, { color: COLORS.white }]}>{t.wineDetail.buyOnSAQ}</Text>
        </Pressable>
      </View>

      {/* Secondary actions */}
      <View style={styles.secondaryActions}>
        <Pressable onPress={handleShare} style={styles.secondaryBtn}>
          <Ionicons name="share-outline" size={18} color={COLORS.burgundy} />
          <Text style={styles.secondaryText}>{t.wineDetail.share}</Text>
        </Pressable>

        <Pressable onPress={() => !inCellar && addToCellar(wine)} style={[styles.secondaryBtn, inCellar && styles.secondaryBtnActive]}>
          <Ionicons name={inCellar ? 'checkmark-circle' : 'wine-outline'} size={18} color={inCellar ? COLORS.gold : COLORS.burgundy} />
          <Text style={[styles.secondaryText, inCellar && { color: COLORS.gold }]}>
            {inCellar ? t.cellar.inCellar : t.cellar.addToCellar}
          </Text>
        </Pressable>
      </View>

      <View style={{ height: SPACING.xl }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={COLORS.burgundy} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: SPACING.md },
  badges: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm, flexWrap: 'wrap' },
  typePill: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: RADIUS.full },
  typePillText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
  badge: { fontSize: 12, color: COLORS.white, backgroundColor: COLORS.gold, paddingHorizontal: 8, paddingVertical: 2, borderRadius: RADIUS.full, overflow: 'hidden', fontWeight: '600' },
  name: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: SPACING.xs },
  appellation: { fontSize: 15, color: COLORS.gray, marginBottom: SPACING.md },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  price: { fontSize: 28, fontWeight: '900', color: COLORS.burgundy },
  origPrice: { fontSize: 18, color: COLORS.gray, textDecorationLine: 'line-through' },
  dealBadge: { backgroundColor: COLORS.gold, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  dealText: { fontSize: 12, fontWeight: '700', color: COLORS.white },
  infoCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.card },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.xs, gap: SPACING.sm },
  infoLabel: { fontSize: 14, color: COLORS.gray, width: 80 },
  infoValue: { fontSize: 14, color: COLORS.black, fontWeight: '500', flex: 1 },
  section: { marginBottom: SPACING.md },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: SPACING.sm },
  description: { fontSize: 15, lineHeight: 22, color: COLORS.grayDark },
  pairingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  pairingChip: { backgroundColor: COLORS.white, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: RADIUS.full, borderWidth: 1, borderColor: COLORS.grayLight },
  pairingText: { fontSize: 13, color: COLORS.grayDark },
  expertRating: { fontSize: 15, color: COLORS.grayDark, marginBottom: SPACING.xs },
  actions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  favBtn: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.burgundy },
  buyBtn: { backgroundColor: COLORS.burgundy },
  actionText: { fontSize: 15, fontWeight: '600', color: COLORS.burgundy },
  secondaryActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  secondaryBtnActive: {
    borderColor: COLORS.gold + '60',
    backgroundColor: COLORS.gold + '10',
  },
  secondaryText: { fontSize: 13, fontWeight: '600', color: COLORS.burgundy },
});
