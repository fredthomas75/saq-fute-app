import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Image, ScrollView, Pressable, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@/constants/theme';
import { analyzeMenuPhoto } from '@/services/chat';
import { useTranslation } from '@/i18n';
import LoadingState from '@/components/LoadingState';
import EmptyState from '@/components/EmptyState';

let ImagePicker: any = null;
try { ImagePicker = require('expo-image-picker'); } catch {}

let CameraViewComponent: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require('expo-camera');
  CameraViewComponent = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

function extractBase64(photo: { base64?: string; uri?: string }): string | null {
  let b64 = photo.base64 || '';
  if (b64.startsWith('data:')) b64 = b64.split(',')[1] || '';
  if (!b64 && photo.uri?.startsWith('data:')) b64 = photo.uri.split(',')[1] || '';
  return b64 || null;
}

export default function MenuScanScreen() {
  const t = useTranslation();
  const router = useRouter();
  const [mode, setMode] = useState<'pick' | 'camera' | 'result'>('pick');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

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

  const pickFromGallery = async () => {
    if (!ImagePicker) return;
    const res = await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 as number });
    if (!res.canceled && res.assets[0]) {
      setImageUri(res.assets[0].uri);
      setMode('result');
      analyzeImage(res.assets[0].base64);
    }
  };

  const reset = () => {
    setMode('pick');
    setImageUri(null);
    setResult(null);
    setError(false);
  };

  // Pick screen
  if (mode === 'pick') {
    return (
      <View style={styles.container}>
        <View style={styles.pickContainer}>
          <Ionicons name="restaurant-outline" size={64} color={COLORS.burgundy} />
          <Text style={styles.pickTitle}>{t.menuScan.title}</Text>

          <Pressable onPress={() => CameraViewComponent ? setMode('camera') : pickFromGallery()} style={styles.pickBtn}>
            <Ionicons name="camera-outline" size={22} color={COLORS.white} />
            <Text style={styles.pickBtnText}>{t.menuScan.takePhoto}</Text>
          </Pressable>

          <Pressable onPress={pickFromGallery} style={[styles.pickBtn, styles.pickBtnSecondary]}>
            <Ionicons name="images-outline" size={22} color={COLORS.burgundy} />
            <Text style={[styles.pickBtnText, styles.pickBtnTextSecondary]}>{t.menuScan.choosePhoto}</Text>
          </Pressable>

          {!ImagePicker && !CameraViewComponent && (
            <Text style={styles.noLib}>{t.menuScan.notInstalled}</Text>
          )}
        </View>
      </View>
    );
  }

  // Camera mode — direct capture like label scanner
  if (mode === 'camera') {
    return (
      <MenuCamera
        t={t}
        onCapture={(base64, uri) => {
          setImageUri(uri);
          setMode('result');
          analyzeImage(base64);
        }}
        onBack={() => setMode('pick')}
      />
    );
  }

  // Result mode
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

function MenuCamera({ t, onCapture, onBack }: { t: any; onCapture: (base64: string, uri: string) => void; onBack: () => void }) {
  const [permission, requestPermission] = useCameraPermissions!();
  const cameraRef = useRef<any>(null);
  const [capturing, setCapturing] = useState(false);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      const base64 = extractBase64(photo);
      if (base64) {
        onCapture(base64, photo.uri || '');
        return;
      }
    } catch (err) {
      console.warn('Menu camera error:', err);
    }
    setCapturing(false);
  }, [capturing, onCapture]);

  if (!permission) return <ActivityIndicator style={{ flex: 1 }} color={COLORS.burgundy} />;

  if (!permission.granted) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="camera-outline" size={64} color={COLORS.burgundy} />
        <Text style={styles.fallbackText}>{t.camera.permissionTitle}</Text>
        <Text style={styles.fallbackSub}>{t.camera.permissionMsg}</Text>
        <Pressable onPress={requestPermission} style={styles.grantBtn}>
          <Text style={styles.grantBtnText}>{t.camera.grant}</Text>
        </Pressable>
        <Pressable onPress={onBack} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>{t.settings.cancel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.cameraContainer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CameraViewComponent
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onCameraReady={() => {}}
      />

      <View style={styles.cameraTopBar}>
        <Pressable onPress={onBack} style={styles.cameraBackBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.cameraTitle}>{t.menuScan.scanMenu}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.cameraViewfinder}>
        {capturing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
          </View>
        )}
      </View>

      <View style={styles.cameraBottom}>
        <Text style={styles.cameraHint}>{t.menuScan.scanMenu}</Text>
        <Pressable onPress={handleCapture} style={styles.captureBtn} disabled={capturing}>
          <View style={[styles.captureInner, capturing && { opacity: 0.5 }]} />
        </Pressable>
        <Text style={styles.captureHintText}>
          {capturing ? t.menuScan.analyzing : t.menuScan.takePhoto}
        </Text>
      </View>
    </KeyboardAvoidingView>
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

  // Camera styles
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  fallback: { flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  fallbackText: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  fallbackSub: { fontSize: 14, color: COLORS.gray },
  grantBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.burgundy, borderRadius: RADIUS.md },
  grantBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  cancelBtnText: { color: COLORS.gray, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  cameraTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  cameraBackBtn: { padding: 4 },
  cameraTitle: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  cameraViewfinder: {
    flex: 1,
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.white + '60',
    borderRadius: RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  analyzingOverlay: { alignItems: 'center', gap: SPACING.sm },
  cameraBottom: { paddingBottom: 50, paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.xs },
  cameraHint: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.white },
  captureHintText: {
    color: COLORS.white + 'AA',
    fontSize: 13,
    fontWeight: '600',
  },
});
