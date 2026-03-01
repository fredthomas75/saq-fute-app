import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
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
let isModernScannerAvailable = false;
try {
  const cam = require('expo-camera');
  CameraViewComponent = cam.CameraView;
  useCameraPermissions = cam.useCameraPermissions;
  isModernScannerAvailable = CameraViewComponent?.isModernBarcodeScannerAvailable ?? false;
} catch {}

// Barcode scanner settings
const BARCODE_SETTINGS = { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] as const };

export default function CameraScreen() {
  const t = useTranslation();
  const router = useRouter();

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

  return <CameraContent router={router} t={t} />;
}

function CameraContent({ router, t }: { router: any; t: any }) {
  const [permission, requestPermission] = useCameraPermissions!();
  const cameraRef = useRef<any>(null);
  const [mode, setMode] = useState<'barcode' | 'label'>('barcode');
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);
  const modernListenerRef = useRef<any>(null);
  const hasLaunchedScanner = useRef(false);

  // Search wine by name with multiple strategies
  const searchWineByName = useCallback(async (wineName: string): Promise<boolean> => {
    // Strategy 1: Search local DB
    setScanStatus(`Recherche: ${wineName}...`);
    try {
      const result = await saqApi.search({ query: wineName.trim(), limit: 5 });
      if (result.wines.length > 0) {
        router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
        return true;
      }
    } catch {}

    // Strategy 2: Browse SAQ.com directly
    setScanStatus('Recherche sur SAQ.com...');
    try {
      const browseResult = await saqApi.browse(wineName.trim());
      if (browseResult.wines && browseResult.wines.length > 0) {
        const wine = browseResult.wines[0];
        if (wine.id) {
          router.replace({ pathname: '/wine/[id]', params: { id: wine.id } });
          return true;
        }
        if (wine.saqUrl) {
          Linking.openURL(wine.saqUrl);
          return true;
        }
      }
    } catch {}

    // Strategy 3: Try with shorter query (first 2-3 words)
    const words = wineName.trim().split(/\s+/);
    if (words.length > 2) {
      const shortQuery = words.slice(0, 3).join(' ');
      setScanStatus(`Recherche: ${shortQuery}...`);
      try {
        const result = await saqApi.search({ query: shortQuery, limit: 5 });
        if (result.wines.length > 0) {
          router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
          return true;
        }
      } catch {}
    }

    return false;
  }, [router]);

  // Process a scanned barcode
  const processBarcode = useCallback((data: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    try { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium); } catch {}
    try { CameraViewComponent?.dismissScanner?.(); } catch {}

    setScanStatus(`Code: ${data}`);

    (async () => {
      try {
        setScanStatus(`Recherche de ${data}...`);
        const result = await saqApi.search({ query: data, limit: 1 });
        if (result.wines.length > 0) {
          router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
          return;
        }
        setScanStatus('Recherche sur SAQ.com...');
        const browseResult = await saqApi.browse(data);
        if (browseResult.wines && browseResult.wines.length > 0) {
          const wine = browseResult.wines[0];
          if (wine.id) {
            router.replace({ pathname: '/wine/[id]', params: { id: wine.id } });
            return;
          }
          if (wine.saqUrl) {
            Linking.openURL(wine.saqUrl);
            return;
          }
        }
        setNotFoundQuery(data);
      } catch {
        setNotFoundQuery(data);
      } finally {
        setScanStatus('');
      }
    })();
  }, [router]);

  // Old API: onBarcodeScanned
  const handleBarcodeScan = useCallback(({ data }: { data: string; type?: string }) => {
    processBarcode(data);
  }, [processBarcode]);

  // Modern scanner listener
  useEffect(() => {
    if (!isModernScannerAvailable || !CameraViewComponent?.onModernBarcodeScanned) return;
    const subscription = CameraViewComponent.onModernBarcodeScanned((event: { data: string; type?: string }) => {
      if (event.data) processBarcode(event.data);
    });
    modernListenerRef.current = subscription;
    return () => {
      subscription?.remove?.();
      modernListenerRef.current = null;
    };
  }, [processBarcode]);

  // Launch modern scanner
  const launchModernScanner = useCallback(async () => {
    if (!isModernScannerAvailable || !CameraViewComponent?.launchScanner) return;
    try {
      await CameraViewComponent.launchScanner({
        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
        isPinchToZoomEnabled: true,
        isGuidanceEnabled: true,
        isHighlightingEnabled: true,
      });
    } catch {}
  }, []);

  // Auto-launch modern scanner on camera ready (native only)
  useEffect(() => {
    if (cameraReady && mode === 'barcode' && isModernScannerAvailable && !hasLaunchedScanner.current && Platform.OS !== 'web') {
      hasLaunchedScanner.current = true;
      // Small delay for camera to stabilize
      const timer = setTimeout(() => launchModernScanner(), 500);
      return () => clearTimeout(timer);
    }
  }, [cameraReady, mode, launchModernScanner]);

  // Label capture with improved search
  const handleLabelCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    setDetectedLabel(null);
    setScanStatus('');
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6 });
      setScanStatus(t.camera.analyzing);
      const wineName = await analyzeWineLabel(photo.base64);
      setDetectedLabel(wineName.trim());

      const found = await searchWineByName(wineName);
      if (!found) {
        setNotFoundQuery(wineName.trim());
      }
    } catch {
      setNotFoundQuery('');
    }
    setAnalyzing(false);
    setScanStatus('');
  }, [router, analyzing, searchWineByName, t]);

  // Manual barcode entry
  const handleManualSubmit = useCallback(() => {
    const code = manualCode.trim();
    if (!code) return;
    setShowManualInput(false);
    processBarcode(code);
  }, [manualCode, processBarcode]);

  const handleOpenSAQ = useCallback(() => {
    const query = encodeURIComponent(notFoundQuery || '');
    const url = query
      ? `https://www.saq.com/fr/catalogsearch/result/?q=${query}`
      : 'https://www.saq.com';
    Linking.openURL(url);
  }, [notFoundQuery]);

  const handleRetry = useCallback(() => {
    setNotFoundQuery(null);
    setDetectedLabel(null);
    setScanned(false);
    scannedRef.current = false;
    setScanStatus('');
    setManualCode('');
    setShowManualInput(false);
  }, []);

  const switchToBarcode = useCallback(() => {
    setMode('barcode');
    setScanned(false);
    scannedRef.current = false;
    setScanStatus('');
    setDetectedLabel(null);
    setNotFoundQuery(null);
  }, []);

  const switchToLabel = useCallback(() => {
    setMode('label');
    setScanStatus('');
    setNotFoundQuery(null);
    setDetectedLabel(null);
  }, []);

  const onCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      try { CameraViewComponent?.dismissScanner?.(); } catch {}
    };
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
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <CameraViewComponent
        ref={cameraRef}
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={mode === 'barcode' ? BARCODE_SETTINGS : undefined}
        onBarcodeScanned={mode === 'barcode' && !scanned ? handleBarcodeScan : undefined}
        onCameraReady={onCameraReady}
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
        {detectedLabel && !notFoundQuery && (
          <View style={styles.scanStatusWrap}>
            <Ionicons name="wine-outline" size={16} color={COLORS.white} />
            <Text style={styles.scanStatusText}>{detectedLabel}</Text>
          </View>
        )}
      </View>

      {/* Not found overlay */}
      {notFoundQuery !== null && (
        <View style={styles.notFoundOverlay}>
          <Ionicons name="search-outline" size={40} color={COLORS.white} />
          <Text style={styles.notFoundTitle}>{t.camera.notFound}</Text>
          {detectedLabel && (
            <Text style={styles.detectedLabelText}>« {detectedLabel} »</Text>
          )}
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

      {/* Manual barcode input overlay */}
      {showManualInput && (
        <View style={styles.manualOverlay}>
          <Text style={styles.manualTitle}>Entrer le code-barres</Text>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder="Ex: 5603016000221"
            placeholderTextColor={COLORS.gray}
            keyboardType="number-pad"
            autoFocus
            onSubmitEditing={handleManualSubmit}
          />
          <View style={styles.manualBtns}>
            <Pressable onPress={() => setShowManualInput(false)} style={styles.manualCancelBtn}>
              <Text style={styles.manualCancelText}>{t.camera.cancel}</Text>
            </Pressable>
            <Pressable onPress={handleManualSubmit} style={styles.manualSubmitBtn}>
              <Ionicons name="search" size={18} color={COLORS.white} />
              <Text style={styles.manualSubmitText}>Chercher</Text>
            </Pressable>
          </View>
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

        {/* Actions */}
        {mode === 'barcode' ? (
          <View style={styles.barcodeControls}>
            {/* Primary action: scan button */}
            <Pressable onPress={isModernScannerAvailable && Platform.OS !== 'web' ? launchModernScanner : handleRetry} style={styles.scanActionBtn}>
              <Ionicons name="scan" size={28} color={COLORS.white} />
              <Text style={styles.scanActionText}>
                {isModernScannerAvailable ? (t.camera.openScanner || 'Scanner') : t.camera.scanning}
              </Text>
            </Pressable>

            {/* Manual entry link */}
            <Pressable onPress={() => setShowManualInput(true)} style={styles.manualEntryLink}>
              <Ionicons name="keypad-outline" size={16} color={COLORS.white + 'CC'} />
              <Text style={styles.manualEntryText}>Entrer le code manuellement</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={handleLabelCapture} style={styles.captureBtn} disabled={analyzing}>
            <View style={styles.captureInner} />
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
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
    top: 0, left: 0, right: 0, bottom: 0,
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
  barcodeControls: {
    alignItems: 'center',
    gap: SPACING.md,
  },
  scanActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 16,
    backgroundColor: COLORS.burgundy,
    borderRadius: RADIUS.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  scanActionText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '800',
  },
  manualEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  manualEntryText: {
    color: COLORS.white + 'CC',
    fontSize: 13,
    textDecorationLine: 'underline',
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
  notFoundOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: COLORS.white },
  notFoundSub: { fontSize: 14, color: '#ffffff99', textAlign: 'center' },
  detectedLabelText: {
    fontSize: 15,
    color: COLORS.white,
    fontStyle: 'italic',
    textAlign: 'center',
    opacity: 0.85,
  },
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
  manualOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    zIndex: 10,
  },
  manualTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  manualInput: {
    width: '100%',
    height: 50,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
    letterSpacing: 2,
  },
  manualBtns: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  manualCancelBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.white + '60',
  },
  manualCancelText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  manualSubmitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.burgundy,
    borderRadius: RADIUS.md,
  },
  manualSubmitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
