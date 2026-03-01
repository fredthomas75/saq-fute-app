import React, { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Platform, KeyboardAvoidingView } from 'react-native';
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

// Helper: extract raw base64 from takePictureAsync result (handles web data URL vs native raw base64)
function extractBase64(photo: { base64?: string; uri?: string }): string | null {
  let b64 = photo.base64 || '';
  if (b64.startsWith('data:')) {
    b64 = b64.split(',')[1] || '';
  }
  if (!b64 && photo.uri?.startsWith('data:')) {
    b64 = photo.uri.split(',')[1] || '';
  }
  return b64 || null;
}

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
  const [analyzing, setAnalyzing] = useState(false);
  const [notFoundQuery, setNotFoundQuery] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);
  const [detectedLabel, setDetectedLabel] = useState<string | null>(null);

  // Clean wine name from AI response
  const cleanWineName = (raw: string): string => {
    let name = raw.trim();
    const lines = name.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 1) name = lines[0];
    name = name.replace(/^["'«»""'']+|["'«»""'']+$/g, '');
    name = name.replace(/^(Le vin est|C'est un?|Il s'agit d[eu']?\s*|The wine is|This is|It'?s a?)\s*/i, '');
    name = name.replace(/\*\*/g, '');
    name = name.replace(/\s*\(.*?\)\s*$/, '');
    name = name.replace(/[.!:]+$/, '');
    name = name.replace(/,\s*(Bordeaux|Bourgogne|Rioja|Toscane|Napa|Barossa|Mendoza|Valle|Vallée|AOC|AOP|DOC|DOCG|IGP|Vin de|Wine from).*$/i, '');
    return name.trim();
  };

  // Try to search and navigate to a wine result
  const trySearch = useCallback(async (query: string): Promise<boolean> => {
    if (!query || query.length < 2) return false;
    try {
      const result = await saqApi.search({ query, limit: 5 });
      if (result.wines.length > 0) {
        router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
        return true;
      }
    } catch {}
    return false;
  }, [router]);

  const tryBrowse = useCallback(async (query: string): Promise<boolean> => {
    if (!query || query.length < 2) return false;
    try {
      const browseResult = await saqApi.browse(query);
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
    return false;
  }, [router]);

  // Search wine by name — multiple strategies
  const searchWineByName = useCallback(async (rawName: string): Promise<boolean> => {
    const name = cleanWineName(rawName);
    const nameNoYear = name.replace(/\b(19|20)\d{2}\b/g, '').trim();
    const nameNoHyphens = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const words = name.split(/[\s-]+/).filter(w => w.length > 1);
    const significantWords = words.filter(w => !['de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux', 'the', 'of', 'and'].includes(w.toLowerCase()));

    setScanStatus(`${t.camera.searchingShort} ${name}...`);
    if (await trySearch(name)) return true;

    if (nameNoHyphens !== name) {
      if (await trySearch(nameNoHyphens)) return true;
    }

    if (nameNoYear !== name && nameNoYear.length > 2) {
      setScanStatus(`${t.camera.searchingShort} ${nameNoYear}...`);
      if (await trySearch(nameNoYear)) return true;
    }

    if (significantWords.length >= 2 && significantWords.length < words.length) {
      const sigQuery = significantWords.join(' ');
      if (await trySearch(sigQuery)) return true;
    }

    setScanStatus(t.camera.searchingSAQ);
    if (await tryBrowse(name)) return true;

    if (nameNoYear !== name && nameNoYear.length > 2) {
      if (await tryBrowse(nameNoYear)) return true;
    }

    if (nameNoHyphens !== name) {
      if (await tryBrowse(nameNoHyphens)) return true;
    }

    if (significantWords.length > 2) {
      const short2 = significantWords.slice(0, 2).join(' ');
      setScanStatus(`${t.camera.searchingShort} ${short2}...`);
      if (await trySearch(short2)) return true;
      if (await tryBrowse(short2)) return true;
    }

    if (significantWords.length > 3) {
      const short3 = significantWords.slice(0, 3).join(' ');
      setScanStatus(`${t.camera.searchingShort} ${short3}...`);
      if (await trySearch(short3)) return true;
    }

    return false;
  }, [trySearch, tryBrowse, t]);

  // Label capture
  const handleLabelCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    setDetectedLabel(null);
    setScanStatus(t.camera.captureStatus);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.7 });
      const base64Data = extractBase64(photo);
      if (!base64Data) {
        throw new Error(t.camera.captureError);
      }
      setScanStatus(t.camera.identifyingWine);
      const wineName = await analyzeWineLabel(base64Data);
      const cleaned = cleanWineName(wineName);
      setDetectedLabel(cleaned);
      setScanStatus('');

      const found = await searchWineByName(cleaned);
      if (!found) {
        setAnalyzing(false);
        setScanStatus('');
        const query = encodeURIComponent(cleaned);
        Linking.openURL(`https://www.saq.com/fr/catalogsearch/result/?q=${query}`);
        return;
      }
    } catch (err) {
      console.warn('Label capture error:', err);
      setNotFoundQuery('');
    }
    setAnalyzing(false);
    setScanStatus('');
  }, [analyzing, searchWineByName, t]);

  const handleOpenSAQ = useCallback(() => {
    const query = encodeURIComponent(detectedLabel || notFoundQuery || '');
    const url = query
      ? `https://www.saq.com/fr/catalogsearch/result/?q=${query}`
      : 'https://www.saq.com';
    Linking.openURL(url);
  }, [notFoundQuery, detectedLabel]);

  const handleRetry = useCallback(() => {
    setNotFoundQuery(null);
    setDetectedLabel(null);
    setScanStatus('');
  }, []);

  const onCameraReady = useCallback(() => {
    setCameraReady(true);
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
            <Text style={styles.analyzingText}>{scanStatus || t.camera.analyzing}</Text>
          </View>
        )}
        {!analyzing && scanStatus !== '' && (
          <View style={styles.scanStatusWrap}>
            <ActivityIndicator size="small" color={COLORS.white} />
            <Text style={styles.scanStatusText}>{scanStatus}</Text>
          </View>
        )}
        {detectedLabel && !notFoundQuery && !analyzing && (
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
          {detectedLabel ? (
            <Text style={styles.detectedLabelText}>{'\u00ab'} {detectedLabel} {'\u00bb'}</Text>
          ) : null}
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
        <Text style={styles.scanHint}>{t.camera.labelHint}</Text>
        <Pressable onPress={handleLabelCapture} style={styles.captureBtn} disabled={analyzing}>
          <View style={[styles.captureInner, analyzing && { opacity: 0.5 }]} />
        </Pressable>
        <Text style={styles.captureHint}>
          {analyzing ? t.camera.analyzing : t.camera.capture}
        </Text>
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
  scanHint: {
    color: COLORS.white,
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
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
  analyzingText: { color: COLORS.white, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  bottom: { paddingBottom: 50, paddingHorizontal: SPACING.md, alignItems: 'center', gap: SPACING.xs },
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
  captureHint: {
    color: COLORS.white + 'AA',
    fontSize: 13,
    fontWeight: '600',
  },
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
});
