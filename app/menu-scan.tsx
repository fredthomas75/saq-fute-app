import React, { useState } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { analyzeMenuPhoto } from '@/services/chat';
import { useTranslation } from '@/i18n';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {}

export default function MenuScanScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const pickImage = async (fromCamera: boolean) => {
    if (!ImagePicker) return;
    const options = { base64: true, quality: 0.7 as number };
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options);

    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      analyzeImage(res.assets[0].base64);
    }
  };

  const analyzeImage = async (base64: string) => {
    setLoading(true);
    setError(false);
    setResult(null);
    try {
      const reply = await analyzeMenuPhoto(base64);
      setResult(reply);
    } catch {
      setError(true);
    }
    setLoading(false);
  };

  const reset = () => {
    setImageUri(null);
    setResult(null);
    setError(false);
  };

  // Initial state — pick options
  if (!imageUri) {
    return (
      <View style={styles.container}>
        <View style={styles.pickContainer}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.burgundy} />
          <Text style={styles.pickTitle}>{t.menuScan.title}</Text>

          <Pressable onPress={() => pickImage(true)} style={styles.pickBtn}>
            <Ionicons name="camera-outline" size={22} color={COLORS.white} />
            <Text style={styles.pickBtnText}>{t.menuScan.takePhoto}</Text>
          </Pressable>

          <Pressable onPress={() => pickImage(false)} style={[styles.pickBtn, styles.pickBtnSecondary]}>
            <Ionicons name="images-outline" size={22} color={COLORS.burgundy} />
            <Text style={[styles.pickBtnText, styles.pickBtnTextSecondary]}>{t.menuScan.choosePhoto}</Text>
          </Pressable>

          {!ImagePicker && (
            <Text style={styles.noLib}>{t.menuScan.notInstalled}</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
      )}

      {loading && <LoadingState message={t.menuScan.analyzing} />}

      {error && (
        <EmptyState
          icon="alert-circle-outline"
          message={t.menuScan.noResults}
          onRetry={reset}
        />
      )}

      {result && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{t.menuScan.results}</Text>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      )}

      {(result || error) && (
        <Pressable onPress={reset} style={styles.retryBtn}>
          <Ionicons name="refresh" size={18} color={COLORS.burgundy} />
          <Text style={styles.retryText}>{t.menuScan.tryAgain}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  content: { padding: SPACING.md, paddingBottom: SPACING.xl },
  pickContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md, padding: SPACING.lg },
  pickTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: SPACING.md },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    width: '80%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.burgundy,
  },
  pickBtnSecondary: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.burgundy },
  pickBtnText: { fontSize: 16, fontWeight: '700', color: COLORS.white },
  pickBtnTextSecondary: { color: COLORS.burgundy },
  noLib: { fontSize: 13, color: COLORS.gray, marginTop: SPACING.md },
  preview: { width: '100%', height: 200, borderRadius: RADIUS.md, marginBottom: SPACING.md },
  resultCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOWS.card,
  },
  resultTitle: { fontSize: 18, fontWeight: '700', color: COLORS.burgundy, marginBottom: SPACING.sm },
  resultText: { fontSize: 15, lineHeight: 22, color: COLORS.black },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    padding: SPACING.md,
  },
  retryText: { fontSize: 15, fontWeight: '600', color: COLORS.burgundy },
});
