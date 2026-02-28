import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { analyzeWineLabel } from '@/services/chat';
import { useTranslation } from '@/i18n';

let Haptics: any = null;
try { Haptics = require('expo-haptics'); } catch {}

let CameraViewComponent: any = null;
let useCameraPermissions: any = null;
try {
  const cam = require('expo-camera');
  CameraViewComponent = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
} catch {}

// Barcode scanner settings — defined outside component to avoid re-creation
const BARCODE_SETTINGS = { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] };

export default function CameraScreen() {
  const t = useTranslation();
  const router = useRouter();

  // Graceful fallback if expo-camera not installed
  if (!CameraViewComponent || !useCameraPermissions) {
    return (
      <View style={styles.fallback}>
        <Ionicons name="camera-outline" size={64} color={COLORS.gray} />
        <Text style={styles.fallbackText}>{t.camera.permissionTitle}</Text>
        <Text style={styles.fallbackSub}>{t.camera.notInstalled}</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtnFallback}>
          <Text style={styles.backBtnText}>OK</Text>
        </Pressable>
      </View>
    );
  }

  // Render the actual camera content — all state lives here
  return <CameraContent router={router} t={t} />;
}

// Separate stable component — won't be recreated on parent re-renders
function CameraContent({ router, t }: { router: any; t: any }) {
  const [permission, requestPermission] = useCameraPermissions!();
  const cameraRef = useRef<any>(null);
  const [mode, setMode] = useState<'barcode' | 'label'>('barcode');
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false); // Ref to avoid stale closure in callback
  const [analyzing, setAnalyzing] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);

  const [scanStatus, setScanStatus] = useState<string>('');

  const handleBarcodeScan = useCallback(({ data, type }: { data: string; type?: string }) => {
    // Use ref to prevent duplicate scans (avoids stale closure with state)
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);

    // Haptic feedback on scan
    try { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium); } catch {}

    setScanStatus(`Code détecté: ${data}`);

    (async () => {
      try {
        setScanStatus(`Recherche de ${data}...`);
        // Try local DB first
        const result = await saqApi.search({ query: data, limit: 1 });
        if (result.wines.length > 0) {
          router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
          return;
        }
        // Fallback: live search on saq.com (supports SAQ codes + EAN barcodes)
        setScanStatus(`Recherche sur SAQ.com...`);
        const browseResult = await saqApi.browse(data);
        if (browseResult.wines && browseResult.wines.length > 0) {
          const wine = browseResult.wines[0];
          if (wine.id) {
            router.replace({ pathname: '/wine/[id]', params: { id: wine.id } });
            return;
          }
          // If no ID but has a SAQ URL, open it
          if (wine.saqUrl) {
            Linking.openURL(wine.saqUrl);
            return;
          }
        }
        setNotFoundQuery(data);
      } catch {
        setNotFoundQuery(data);
      }
    })();
  }, [router]);

  const handleLabelCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      const wineName = await analyzeWineLabel(photo.base64);
      const result = await saqApi.search({ query: wineName.trim(), limit: 5 });
      if (result.wines.length > 0) {
        router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
      } else {
        setNotFoundQuery(wineName.trim());
      }
    } catch (e) {
      setNotFoundQuery('');
    }
    setAnalyzing(false);
  }, [router, analyzing]);

  const handleOpenSAQ = useCallback(() => {
    const query = encodeURIComponent(notFoundQuery || '');
    const url = query
      ? `https://www.saq.com/fr/catalogsearch/result/?q=${query}`
      : 'https://www.saq.com';
    Linking.openURL(url);
  }, [notFoundQuery]);

  const handleRetry = useCallback(() => {
    setNotFoundQuery(null);
    setScanned(false);
    scannedRef.current = false;
    setScanStatus('');
  }, []);

  const switchToBarcode = useCallback(() => {
    setMode('barcode');
    setScanned(false);
    scannedRef.current = false;
  }, []);

  const switchToLabel = useCallback(() => {
    setMode('label');
  }, []);

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
        <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
          <Text style={styles.cancelBtnText}>{t.camera.cancel}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraViewComponent
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={mode === 'barcode' ? BARCODE_SETTINGS : undefined}
        onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcodeScan : undefined}
      />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </Pressable>
        <Text style={styles.title}>{t.camera.title}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Viewfinder */}
      <View style={styles.viewfinder}>
        {analyzing && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color={COLORS.white} />
            <Text style={styles.analyzingText}>{t.camera.analyzing}</Text>
          </View>
        )}
        {mode === 'barcode' && !scanned && !analyzing && (
          <View style={styles.scanLineWrap}>
            <View style={styles.scanLine} />
            <Text style={styles.scanHint}>{t.camera.scanning}</Text>
          </View>
        )}
        {scanStatus !== '' && (
          <View style={styles.scanStatusWrap}>
            <ActivityIndicator size="small" color={COLORS.white} />
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          </View>
        )}
      </View>

      {/* Not found overlay */}
      {notFoundQuery !== null && (
        <View style={styles.notFoundOverlay}>
          <Ionicons name="search-outline" size={40} color={COLORS.white} />
          <Text style={styles.notFoundTitle}>{t.camera.notFound}</Text>
          <Text style={styles.notFoundSub}>{t.camera.notFoundSub}</Text>
          <Pressable onPress={handleOpenSAQ} style={styles.saqBtn}>
            <Ionicons name="open-outline" size={18} color={COLORS.white} />
            <Text style={styles.saqBtnText}>{t.camera.searchSAQ}</Text>
          </Pressable>
          <Pressable onPress={handleRetry} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>{t.camera.retry}</Text>
          </Pressable>
        </View>
      )}

      {/* Bottom controls */}
      <View style={styles.bottom}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <Pressable
            onPress={switchToBarcode}
            style={[styles.modeBtn, mode === 'barcode' && styles.modeBtnActive]}
          >
            <Ionicons name="barcode-outline" size={18} color={mode === 'barcode' ? COLORS.white : COLORS.grayDark} />
            <Text style={[styles.modeText, mode === 'barcode' && styles.modeTextActive]}>{t.camera.barcode}</Text>
          </Pressable>
          <Pressable
            onPress={switchToLabel}
            style={[styles.modeBtn, mode === 'label' && styles.modeBtnActive]}
          >
            <Ionicons name="image-outline" size={18} color={mode === 'label' ? COLORS.white : COLORS.grayDark} />
            <Text style={[styles.modeText, mode === 'label' && styles.modeTextActive]}>{t.camera.label}</Text>
          </Pressable>
        </View>

        {/* Hint or capture button */}
        {mode === 'barcode' ? (
          <Text style={styles.hint}>{t.camera.scanning}</Text>
        ) : (
          <Pressable onPress={handleLabelCapture} style={styles.captureBtn} disabled={analyzing}>
            <View style={styles.captureInner} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fallback: { flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  fallbackText: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  fallbackSub: { fontSize: 14, color: COLORS.gray },
  backBtnFallback: { marginTop: SPACING.md, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, backgroundColor: COLORS.burgundy, borderRadius: RADIUS.md },
  backBtnText: { color: COLORS.white, fontWeight: '700' },
  grantBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, backgroundColor: COLORS.burgundy, borderRadius: RADIUS.md },
  grantBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  cancelBtn: { paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  cancelBtnText: { color: COLORS.gray, fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.white },
  viewfinder: {
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
  scanLineWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanLine: {
    width: '80%',
    height: 2,
    backgroundColor: COLORS.burgundy,
    opacity: 0.8,
  },
  scanHint: {
    color: COLORS.white,
    fontSize: 13,
    marginTop: SPACING.md,
    textAlign: 'center',
    opacity: 0.7,
  },
  scanStatusWrap: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  scanStatusText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  analyzingOverlay: { alignItems: 'center', gap: SPACING.sm },
  analyzingText: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  bottom: { paddingBottom: 50, paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.md },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: '#ffffff20',
    borderRadius: RADIUS.full,
    padding: 3,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  modeBtnActive: { backgroundColor: COLORS.burgundy },
  modeText: { fontSize: 14, fontWeight: '600', color: COLORS.grayDark },
  modeTextActive: { color: COLORS.white },
  hint: { color: COLORS.white + 'AA', fontSize: 14 },
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
  notFoundOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  notFoundSub: { fontSize: 14, color: '#ffffff99', textAlign: 'center' },
  saqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.burgundy,
    borderRadius: RADIUS.md,
  },
  saqBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  retryBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
  },
  retryBtnText: { color: '#ffffffCC', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },
});
