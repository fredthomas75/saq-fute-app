import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Linking, Share, TextInput, Modal, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { TYPE_COLORS } from '@/constants/wine';
import { saqApi } from '@/services/api';
import { useFavorites } from '@/context/FavoritesContext';
import { useCellar } from '@/context/CellarContext';
import { useWishlist } from '@/context/WishlistContext';
import { useWineNotes } from '@/context/WineNotesContext';
import { useToast } from '@/context/ToastContext';
import { useRecentlyViewed } from '@/context/RecentlyViewedContext';
import { useTranslation, useTranslateCountry } from '@/i18n';
import { useThemeColors } from '@/hooks/useThemeColors';
import { hapticLight, hapticSuccess } from '@/services/haptics';
import type { Wine } from '@/types/wine';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';
import DealBadge from '@/components/DealBadge';
import WineCard from '@/components/WineCard';

/**
 * Strip serving-temperature sentences from description text.
 * These are redundant when conseil.service is available.
 * Matches patterns like:
 *   "Servir à 14-16°C"  "Servir entre 10 et 12 °C"
 *   "Servir à 14 °C."   "À servir à 16-18°C"
 *   "Servir frais, à 8-10°C"  "Température de service : 14-16 °C"
 */
function stripServiceTemp(description: string): string {
  return description
    // "Servir à X-Y°C" / "Servir entre X et Y°C" (with optional leading "À")
    .replace(/[àa]?\s*servir\s+(?:frais\s*,?\s*)?(?:à|entre)\s*\d{1,2}\s*(?:[-–]\s*\d{1,2}\s*|et\s*\d{1,2}\s*)?°\s*C\.?/gi, '')
    // "Température de service : X-Y °C"
    .replace(/temp[ée]rature\s+de\s+service\s*[:]\s*\d{1,2}\s*(?:[-–]\s*\d{1,2}\s*)?°\s*C\.?/gi, '')
    // Clean up leftover double spaces / leading/trailing whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export default function WineDetailScreen() {
  const t = useTranslation();
  const tc = useTranslateCountry();
  const colors = useThemeColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, addFavorite, removeFavorite } = useFavorites();
  const { isInCellar, addToCellar } = useCellar();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const { getNote, setNote } = useWineNotes();
  const { showToast } = useToast();
  const { addViewed } = useRecentlyViewed();
  const [wine, setWine] = useState<Wine | null>(null);
  const [similarWines, setSimilarWines] = useState<Wine[]>([]);
  const [conseil, setConseil] = useState<{ service?: string; carafage?: string; conservation?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteRating, setNoteRating] = useState(0);
  const [showCellarModal, setShowCellarModal] = useState(false);
  const [cellarQty, setCellarQty] = useState(1);

  const existingNote = getNote(id || '');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    saqApi.advice(id).then((data) => {
      if (!data.wine) {
        setError(data.error || 'Wine not found');
        return;
      }
      setWine(data.wine);
      addViewed(data.wine);
      // Conseil can be at top-level OR nested inside wine — use whichever exists
      setConseil(data.conseil || (data.wine as any).conseil || null);
      // Fetch similar wines — try grape first, fall back to type+price only
      const w = data.wine;
      const grape = w.grapes?.[0];
      const minP = Math.round((w.price || 10) * 0.7);
      const maxP = Math.round((w.price || 30) * 1.3);
      // API type filter expects French names — reverse-map if translated
      const typeMap: Record<string, string> = { Red: 'Rouge', White: 'Blanc', Rosé: 'Rosé', Sparkling: 'Mousseux' };
      const apiType = typeMap[w.type] || w.type;
      const fetchSimilar = async () => {
        if (grape) {
          const sim = await saqApi.search({ type: apiType, grape, minPrice: minP, maxPrice: maxP, limit: 10 } as any);
          const filtered = sim.wines.filter((sw: Wine) => sw.id !== w.id);
          if (filtered.length >= 2) { setSimilarWines(filtered.slice(0, 6)); return; }
        }
        // Fallback: broader search without grape
        const sim2 = await saqApi.search({ type: apiType, minPrice: minP, maxPrice: maxP, limit: 10 } as any);
        setSimilarWines(sim2.wines.filter((sw: Wine) => sw.id !== w.id).slice(0, 6));
      };
      fetchSimilar().catch(() => {});
    }).catch((err) => {
      setError(err.message);
    }).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (existingNote) {
      setNoteText(existingNote.note);
      setNoteRating(existingNote.rating || 0);
    }
  }, [existingNote?.dateModified]);

  // Memoize cleaned description — must be BEFORE early returns (Rules of Hooks)
  const cleanDescription = useMemo(() => {
    if (!wine?.description) return '';
    return conseil?.service ? stripServiceTemp(wine.description) : wine.description;
  }, [wine?.description, conseil?.service]);

  if (loading) return <LoadingState message={t.wineDetail.loading} />;
  if (error || !wine) return <EmptyState icon="alert-circle-outline" message={t.wineDetail.notFound} submessage={error || ''} />;

  const fav = isFavorite(wine.id);
  const inCellar = isInCellar(wine.id);
  const wished = isInWishlist(wine.id);

  const handleSaveNote = () => {
    if (noteText.trim() || noteRating > 0) {
      setNote(wine.id, wine.name, noteText.trim(), noteRating || undefined);
      hapticSuccess();
      showToast(t.toast.noteSaved);
    }
    setEditingNote(false);
  };

  const handleRating = (star: number) => {
    hapticLight();
    const newRating = star === noteRating ? 0 : star;
    setNoteRating(newRating);
    if (noteText.trim() || newRating > 0) {
      setNote(wine.id, wine.name, noteText.trim(), newRating || undefined);
    }
  };

  const handleShare = async () => {
    try {
      const dealInfo = wine.dealScore >= 80
        ? ` (${wine.dealScore >= 95 ? '🏆 TROUVAILLE' : wine.dealScore >= 88 ? '🔥 Aubaine' : '👍 Bon rapport Q/P'})`
        : '';
      const ratingStars = noteRating > 0 ? '\n' + '⭐'.repeat(noteRating) + ` (${noteRating}/5)` : '';
      const userNoteText = existingNote?.note ? `\n📝 ${existingNote.note}` : '';
      await Share.share({
        message: `🍷 ${wine.name}\n💰 ${wine.price?.toFixed(2)}$${dealInfo}${ratingStars}${userNoteText}\n🔗 ${wine.saqUrl}`,
      });
    } catch (_) {
      // User cancelled or share failed — ignore
    }
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.cream }]} contentContainerStyle={styles.content}>
      {/* Header badges */}
      <View style={styles.badges}>
        <View style={[styles.typePill, { backgroundColor: TYPE_COLORS[wine.type] || colors.gray }]}>
          <Text style={styles.typePillText}>{t.wineTypes[wine.type] || wine.type}</Text>
        </View>
        {wine.isOrganic && <Text style={styles.badge}>{t.wineDetail.bio}</Text>}
        {wine.coeurBadge && <Text style={styles.badge}>{t.wineDetail.coupDeCoeur}</Text>}
        {wine.onSale && <Text style={[styles.badge, { backgroundColor: COLORS.red }]}>{t.wineDetail.promo}</Text>}
      </View>

      <Text style={[styles.name, { color: colors.black }]}>{wine.name}</Text>
      <Text style={styles.appellation}>{wine.appellation}</Text>

      {/* Price + Deal */}
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.burgundy }]}>{wine.price?.toFixed(2)}$</Text>
        {wine.onSale && wine.originalPrice && (
          <Text style={styles.origPrice}>{wine.originalPrice.toFixed(2)}$</Text>
        )}
        <DealBadge dealScore={wine.dealScore} size="md" />
      </View>

      {/* Info grid */}
      <View style={[styles.infoCard, { backgroundColor: colors.white }]}>
        {wine.country && <InfoRow icon="globe-outline" label={t.wineDetail.country} value={tc(wine.country)} />}
        {wine.region && <InfoRow icon="location-outline" label={t.wineDetail.region} value={wine.region} />}
        {wine.grapes && wine.grapes.length > 0 && <InfoRow icon="leaf-outline" label={t.wineDetail.grapes} value={wine.grapes.join(', ')} />}
        {wine.tasteProfile && <InfoRow icon="color-palette-outline" label={t.wineDetail.profile} value={wine.tasteProfile} />}
      </View>

      {/* Description — serving temp stripped if conseil provides it */}
      {cleanDescription ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineDetail.description}</Text>
          <Text style={[styles.description, { color: colors.grayDark }]}>{cleanDescription}</Text>
        </View>
      ) : null}

      {/* Conseil de service — show section if conseil OR wine.servingTemp available */}
      {(conseil || wine.servingTemp) && (
        <View style={[styles.infoCard, { backgroundColor: colors.white }]}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineDetail.advice}</Text>
          {/* Serving temp: prefer conseil.service, fallback to wine.servingTemp */}
          {(conseil?.service || wine.servingTemp) && (
            <InfoRow icon="thermometer-outline" label={t.wineDetail.service} value={conseil?.service || wine.servingTemp!} />
          )}
          {conseil?.carafage && <InfoRow icon="time-outline" label={t.wineDetail.decanting} value={conseil.carafage} />}
          {(conseil?.conservation || wine.agingPotential) && (
            <InfoRow icon="calendar-outline" label={t.wineDetail.conservation} value={conseil?.conservation || wine.agingPotential!} />
          )}
        </View>
      )}

      {/* Food pairing */}
      {wine.foodPairing && wine.foodPairing.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineDetail.pairings}</Text>
          <View style={styles.pairingRow}>
            {wine.foodPairing.map((f, i) => (
              <View key={i} style={[styles.pairingChip, { backgroundColor: colors.white, borderColor: colors.grayLight }]}>
                <Text style={[styles.pairingText, { color: colors.grayDark }]}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Expert ratings */}
      {wine.expertRatings && wine.expertRatings.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineDetail.expertRatings}</Text>
          {wine.expertRatings.map((r, i) => (
            <Text key={i} style={[styles.expertRating, { color: colors.grayDark }]}>{r.source}: {r.score}/100</Text>
          ))}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={() => { hapticLight(); if (fav) { removeFavorite(wine.id); showToast(t.toast.favoriteRemoved); } else { addFavorite(wine); showToast(t.toast.favoriteAdded); } }} style={[styles.actionBtn, styles.favBtn, { backgroundColor: colors.white, borderColor: colors.burgundy }]} accessibilityLabel={fav ? t.wineDetail.remove : t.wineDetail.favorite} accessibilityRole="button">
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? COLORS.red : colors.burgundy} />
          <Text style={[styles.actionText, { color: colors.burgundy }]}>{fav ? t.wineDetail.remove : t.wineDetail.favorite}</Text>
        </Pressable>

        <Pressable onPress={() => Linking.openURL(wine.saqUrl)} style={[styles.actionBtn, styles.buyBtn, { backgroundColor: colors.burgundy }]} accessibilityLabel={t.wineDetail.buyOnSAQ} accessibilityRole="link">
          <Ionicons name="cart-outline" size={20} color={COLORS.white} />
          <Text style={[styles.actionText, { color: COLORS.white }]}>{t.wineDetail.buyOnSAQ}</Text>
        </Pressable>
      </View>

      {/* Secondary actions */}
      <View style={styles.secondaryActions}>
        <Pressable onPress={handleShare} style={[styles.secondaryBtn, { backgroundColor: colors.white, borderColor: colors.grayLight }]} accessibilityLabel={t.wineDetail.share} accessibilityRole="button">
          <Ionicons name="share-outline" size={18} color={colors.burgundy} />
          <Text style={[styles.secondaryText, { color: colors.burgundy }]}>{t.wineDetail.share}</Text>
        </Pressable>

        <Pressable onPress={() => { hapticLight(); if (wished) { removeFromWishlist(wine.id); showToast(t.toast.wishlistRemoved); } else { addToWishlist(wine); showToast(t.toast.wishlistAdded); } }} style={[styles.secondaryBtn, { backgroundColor: colors.white, borderColor: colors.grayLight }, wished && styles.secondaryBtnActive]} accessibilityLabel={wished ? t.wishlist.inList : t.wishlist.add} accessibilityRole="button">
          <Ionicons name={wished ? 'bookmark' : 'bookmark-outline'} size={18} color={wished ? COLORS.gold : COLORS.burgundy} />
          <Text style={[styles.secondaryText, wished && { color: COLORS.gold }]}>
            {wished ? t.wishlist.inList : t.wishlist.add}
          </Text>
        </Pressable>

        <Pressable onPress={() => { if (!inCellar) { hapticLight(); setCellarQty(1); setShowCellarModal(true); } }} style={[styles.secondaryBtn, { backgroundColor: colors.white, borderColor: colors.grayLight }, inCellar && styles.secondaryBtnActive]} accessibilityLabel={inCellar ? t.cellar.inCellar : t.cellar.addToCellar} accessibilityRole="button">
          <Ionicons name={inCellar ? 'checkmark-circle' : 'wine-outline'} size={18} color={inCellar ? COLORS.gold : COLORS.burgundy} />
          <Text style={[styles.secondaryText, inCellar && { color: COLORS.gold }]}>
            {inCellar ? t.cellar.inCellar : t.cellar.addToCellar}
          </Text>
        </Pressable>
      </View>

      {/* My Notes */}
      <View style={[styles.notesSection, { backgroundColor: colors.white }]}>
        <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineNotes.myNotes}</Text>

        {/* Star rating */}
        <View style={styles.starsRow}>
          <Text style={styles.starsLabel}>{t.wineNotes.myRating}</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => handleRating(star)} hitSlop={6} accessibilityLabel={`${star}/5`} accessibilityRole="button" accessibilityState={{ selected: star <= noteRating }}>
                <Ionicons
                  name={star <= noteRating ? 'star' : 'star-outline'}
                  size={24}
                  color={star <= noteRating ? COLORS.gold : COLORS.grayLight}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {editingNote ? (
          <TextInput
            style={[styles.noteInput, { borderColor: colors.grayLight, color: colors.black }]}
            value={noteText}
            onChangeText={setNoteText}
            placeholder={t.wineNotes.placeholder}
            placeholderTextColor={COLORS.gray}
            multiline
            autoFocus
            onBlur={handleSaveNote}
            accessibilityLabel={t.wineNotes.placeholder}
          />
        ) : existingNote?.note ? (
          <Pressable onPress={() => setEditingNote(true)} style={[styles.noteDisplay, { backgroundColor: colors.cream }]} accessibilityLabel={t.wineNotes.myNotes} accessibilityRole="button" accessibilityHint="Tap to edit note">
            <Text style={[styles.noteDisplayText, { color: colors.grayDark }]}>{existingNote.note}</Text>
            <Ionicons name="pencil-outline" size={16} color={COLORS.gray} />
          </Pressable>
        ) : (
          <Pressable onPress={() => setEditingNote(true)} style={styles.addNoteBtn} accessibilityLabel={t.wineNotes.addNote} accessibilityRole="button">
            <Ionicons name="create-outline" size={18} color={COLORS.burgundy} />
            <Text style={[styles.addNoteText, { color: colors.burgundy }]}>{t.wineNotes.addNote}</Text>
          </Pressable>
        )}
      </View>

      {/* Similar wines */}
      {similarWines.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.black }]}>{t.wineDetail.similarWines}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: SPACING.md }}>
            {similarWines.map((sw) => (
              <WineCard key={sw.id} wine={sw} compact />
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: SPACING.xl }} />

      {/* Cellar quantity picker modal */}
      <Modal visible={showCellarModal} transparent animationType="fade" onRequestClose={() => setShowCellarModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCellarModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.white }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.black }]}>{t.cellar.howMany}</Text>
            <Text style={[styles.modalWineName, { color: colors.gray }]} numberOfLines={2}>{wine.name}</Text>
            <View style={styles.modalQtyRow}>
              <Pressable onPress={() => setCellarQty(Math.max(1, cellarQty - 1))} style={[styles.modalQtyBtn, { backgroundColor: colors.cream, borderColor: colors.grayLight }]} accessibilityLabel="Decrease quantity" accessibilityRole="button">
                <Ionicons name="remove" size={22} color={colors.burgundy} />
              </Pressable>
              <Text style={[styles.modalQtyValue, { color: colors.burgundy }]} accessibilityLabel={`${cellarQty} bottles`}>{cellarQty}</Text>
              <Pressable onPress={() => setCellarQty(Math.min(999, cellarQty + 1))} style={[styles.modalQtyBtn, { backgroundColor: colors.cream, borderColor: colors.grayLight }]} accessibilityLabel="Increase quantity" accessibilityRole="button">
                <Ionicons name="add" size={22} color={colors.burgundy} />
              </Pressable>
            </View>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowCellarModal(false)} style={[styles.modalCancelBtn, { borderColor: colors.grayLight }]}>
                <Text style={[styles.modalCancelText, { color: colors.gray }]}>{t.settings.cancel}</Text>
              </Pressable>
              <Pressable onPress={() => { addToCellar(wine, cellarQty); hapticSuccess(); showToast(t.toast.cellarAdded); setShowCellarModal(false); }} style={[styles.modalConfirmBtn, { backgroundColor: colors.burgundy }]}>
                <Ionicons name="wine-outline" size={18} color={COLORS.white} />
                <Text style={styles.modalConfirmText}>{t.cellar.add} ({cellarQty})</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color={colors.burgundy} />
      <Text style={[styles.infoLabel, { color: colors.gray }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.black }]}>{value}</Text>
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
  notesSection: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  starsLabel: { fontSize: 14, color: COLORS.gray },
  stars: { flexDirection: 'row', gap: 4 },
  noteInput: {
    borderWidth: 1,
    borderColor: COLORS.grayLight,
    borderRadius: RADIUS.sm,
    padding: SPACING.sm,
    fontSize: 14,
    color: COLORS.black,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  noteDisplay: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    padding: SPACING.sm,
    backgroundColor: COLORS.cream,
    borderRadius: RADIUS.sm,
  },
  noteDisplayText: { flex: 1, fontSize: 14, color: COLORS.grayDark, lineHeight: 20 },
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
  },
  addNoteText: { fontSize: 14, color: COLORS.burgundy, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SPACING.xs,
  },
  modalWineName: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  modalQtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.cream,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  modalQtyValue: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.burgundy,
    minWidth: 50,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.grayLight,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray,
  },
  modalConfirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.burgundy,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.white,
  },
});
