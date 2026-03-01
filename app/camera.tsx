import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking, Platform, TextInput, KeyboardAvoidingView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@/constants/theme';
import { saqApi } from '@/services/api';
import { analyzeWineLabel, readBarcodeFromImage } from '@/services/chat';
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

const isWeb = Platform.OS === 'web';
const BARCODE_SETTINGS = { barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'] as const };

// Helper: extract raw base64 from takePictureAsync result (handles web data URL vs native raw base64)
function extractBase64(photo: { base64?: string; uri?: string }): string | null {
  let b64 = photo.base64 || '';
  // On web, base64 is a full data URL — strip the prefix
  if (b64.startsWith('data:')) {
    b64 = b64.split(',')[1] || '';
  }
  // If still empty, try extracting from uri
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
  const webScanIntervalRef = useRef<any>(null);
  const webScanTimeoutRef = useRef<any>(null);

  // Clean wine name from AI response
  const cleanWineName = (raw: string): string => {
    let name = raw.trim();
    // If multi-line, take only the first non-empty line
    const lines = name.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length > 1) name = lines[0];
    // Remove surrounding quotes
    name = name.replace(/^["'«»""'']+|["'«»""'']+$/g, '');
    // Remove common AI prefixes (FR + EN)
    name = name.replace(/^(Le vin est|C'est un?|Il s'agit d[eu']?\s*|The wine is|This is|It'?s a?)\s*/i, '');
    // Remove markdown bold
    name = name.replace(/\*\*/g, '');
    // Remove trailing period/punctuation/parenthetical
    name = name.replace(/\s*\(.*?\)\s*$/, '');
    name = name.replace(/[.!:]+$/, '');
    // Remove trailing descriptors after comma (e.g. "Mouton Cadet, Bordeaux 2022")
    name = name.replace(/,\s*(Bordeaux|Bourgogne|Rioja|Toscane|Napa|Barossa|Mendoza|Valle|Vallée|AOC|AOP|DOC|DOCG|IGP|Vin de|Wine from).*$/i, '');
    return name.trim();
  };

  // Try to resolve barcode via Open Food Facts API
  const lookupBarcodeExternal = async (barcode: string): Promise<string | null> => {
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.status === 1 && data.product) {
        return data.product.product_name || data.product.generic_name || null;
      }
      return null;
    } catch {
      return null;
    }
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

  // Search wine by name — multiple strategies with progressive simplification
  const searchWineByName = useCallback(async (rawName: string): Promise<boolean> => {
    const name = cleanWineName(rawName);
    const nameNoYear = name.replace(/\b(19|20)\d{2}\b/g, '').trim();
    const nameNoHyphens = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
    const words = name.split(/[\s-]+/).filter(w => w.length > 1);
    // Remove common French articles/prepositions for keyword searches
    const significantWords = words.filter(w => !['de', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 'et', 'en', 'au', 'aux', 'the', 'of', 'and'].includes(w.toLowerCase()));

    // Strategy 1: full cleaned name in local DB
    setScanStatus(`${t.camera.searchingShort} ${name}...`);
    if (await trySearch(name)) return true;

    // Strategy 1b: name with hyphens replaced by spaces
    if (nameNoHyphens !== name) {
      if (await trySearch(nameNoHyphens)) return true;
    }

    // Strategy 2: name without year
    if (nameNoYear !== name && nameNoYear.length > 2) {
      setScanStatus(`${t.camera.searchingShort} ${nameNoYear}...`);
      if (await trySearch(nameNoYear)) return true;
    }

    // Strategy 2b: significant words only (no articles/prepositions)
    if (significantWords.length >= 2 && significantWords.length < words.length) {
      const sigQuery = significantWords.join(' ');
      if (await trySearch(sigQuery)) return true;
    }

    // Strategy 3: browse SAQ.com with full name
    setScanStatus(t.camera.searchingSAQ);
    if (await tryBrowse(name)) return true;

    // Strategy 4: browse without year
    if (nameNoYear !== name && nameNoYear.length > 2) {
      if (await tryBrowse(nameNoYear)) return true;
    }

    // Strategy 4b: browse with hyphens as spaces
    if (nameNoHyphens !== name) {
      if (await tryBrowse(nameNoHyphens)) return true;
    }

    // Strategy 5: first 2 significant words only
    if (significantWords.length > 2) {
      const short2 = significantWords.slice(0, 2).join(' ');
      setScanStatus(`${t.camera.searchingShort} ${short2}...`);
      if (await trySearch(short2)) return true;
      if (await tryBrowse(short2)) return true;
    }

    // Strategy 6: first 3 significant words
    if (significantWords.length > 3) {
      const short3 = significantWords.slice(0, 3).join(' ');
      setScanStatus(`${t.camera.searchingShort} ${short3}...`);
      if (await trySearch(short3)) return true;
    }

    return false;
  }, [trySearch, tryBrowse, t]);

  // Process a scanned barcode
  const processBarcode = useCallback((data: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanned(true);
    // Stop web continuous scan + timeout
    if (webScanIntervalRef.current) {
      clearInterval(webScanIntervalRef.current);
      webScanIntervalRef.current = null;
    }
    if (webScanTimeoutRef.current) {
      clearTimeout(webScanTimeoutRef.current);
      webScanTimeoutRef.current = null;
    }
    try { Haptics?.impactAsync?.(Haptics.ImpactFeedbackStyle?.Medium); } catch {}
    try { CameraViewComponent?.dismissScanner?.(); } catch {}

    setScanStatus(`${t.camera.codeDetected} ${data}`);

    (async () => {
      try {
        setScanStatus(`${t.camera.searchingFor} ${data}...`);
        const result = await saqApi.search({ query: data, limit: 1 });
        if (result.wines.length > 0) {
          router.replace({ pathname: '/wine/[id]', params: { id: result.wines[0].id } });
          return;
        }
        setScanStatus(t.camera.searchingSAQ);
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

        // Strategy 3: Resolve EAN barcode via Open Food Facts → get wine name → search SAQ
        setScanStatus(t.camera.identifyingProduct);
        const productName = await lookupBarcodeExternal(data);
        if (productName) {
          const cleaned = cleanWineName(productName);
          setDetectedLabel(cleaned);
          const found = await searchWineByName(cleaned);
          if (found) return;
          // Name found but not in SAQ → redirect to SAQ.com search
          setScanStatus('');
          const q = encodeURIComponent(cleaned);
          Linking.openURL(`https://www.saq.com/fr/catalogsearch/result/?q=${q}`);
          return;
        }

        setNotFoundQuery(data);
      } catch {
        setNotFoundQuery(data);
      } finally {
        setScanStatus('');
      }
    })();
  }, [router, searchWineByName, t]);

  // Web: capture photo and read barcode via vision API (fallback for browsers without BarcodeDetector)
  const handleWebBarcodeCapture = useCallback(async () => {
    if (!cameraRef.current || analyzing) return;
    setAnalyzing(true);
    setScanStatus(t.camera.captureStatus);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.8 });
      const base64Data = extractBase64(photo);
      if (!base64Data) {
        throw new Error(t.camera.captureError);
      }
      setScanStatus(t.camera.analyzing);
      const code = await readBarcodeFromImage(base64Data);
      if (code) {
        setAnalyzing(false);
        processBarcode(code);
        return;
      }
      // No barcode found by vision — offer manual entry
      setAnalyzing(false);
      setScanStatus('');
      setShowManualInput(true);
    } catch {
      setAnalyzing(false);
      setScanStatus('');
      setShowManualInput(true);
    }
  }, [analyzing, processBarcode, t]);

  // Web: continuous barcode scanning using BarcodeDetector on video element
  const startWebContinuousScan = useCallback(() => {
    if (!isWeb || webScanIntervalRef.current) return;

    const hasBarcodeDetector = typeof (window as any).BarcodeDetector !== 'undefined';
    if (!hasBarcodeDetector) {
      // No BarcodeDetector (Safari/iOS) — show manual entry immediately
      setShowManualInput(true);
      return;
    }

    try {
      const detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'qr_code'],
      });

      setScanStatus(t.camera.webScanning);

      webScanIntervalRef.current = setInterval(async () => {
        if (scannedRef.current) {
          clearInterval(webScanIntervalRef.current);
          webScanIntervalRef.current = null;
          return;
        }
        try {
          // Find the video element rendered by CameraView
          const video = document.querySelector('video');
          if (!video || video.readyState < 2) return; // Not ready yet
          const results = await detector.detect(video);
          if (results.length > 0 && results[0].rawValue) {
            if (webScanTimeoutRef.current) {
              clearTimeout(webScanTimeoutRef.current);
              webScanTimeoutRef.current = null;
            }
            processBarcode(results[0].rawValue);
          }
        } catch {
          // Ignore frame errors, keep scanning
        }
      }, 600);

      // Auto-timeout after 10s → fall back to manual entry
      webScanTimeoutRef.current = setTimeout(() => {
        if (webScanIntervalRef.current && !scannedRef.current) {
          clearInterval(webScanIntervalRef.current);
          webScanIntervalRef.current = null;
          setScanStatus('');
          setShowManualInput(true);
        }
      }, 10000);
    } catch {
      setScanStatus(t.camera.webScanError);
    }
  }, [processBarcode, t]);

  // Stop web continuous scan
  const stopWebContinuousScan = useCallback(() => {
    if (webScanIntervalRef.current) {
      clearInterval(webScanIntervalRef.current);
      webScanIntervalRef.current = null;
    }
    if (webScanTimeoutRef.current) {
      clearTimeout(webScanTimeoutRef.current);
      webScanTimeoutRef.current = null;
    }
  }, []);

  // Start continuous web scan when camera is ready in barcode mode
  useEffect(() => {
    if (isWeb && cameraReady && mode === 'barcode' && !scanned) {
      startWebContinuousScan();
    }
    return () => stopWebContinuousScan();
  }, [cameraReady, mode, scanned, startWebContinuousScan, stopWebContinuousScan]);

  // Old API: onBarcodeScanned (native only)
  const handleBarcodeScan = useCallback(({ data }: { data: string; type?: string }) => {
    processBarcode(data);
  }, [processBarcode]);

  // Modern scanner listener (native only)
  useEffect(() => {
    if (isWeb || !isModernScannerAvailable || !CameraViewComponent?.onModernBarcodeScanned) return;
    const subscription = CameraViewComponent.onModernBarcodeScanned((event: { data: string; type?: string }) => {
      if (event.data) processBarcode(event.data);
    });
    modernListenerRef.current = subscription;
    return () => {
      subscription?.remove?.();
      modernListenerRef.current = null;
    };
  }, [processBarcode]);

  // Launch modern scanner (native only)
  const launchModernScanner = useCallback(async () => {
    if (isWeb || !isModernScannerAvailable || !CameraViewComponent?.launchScanner) return;
    try {
      await CameraViewComponent.launchScanner({
        barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'qr'],
        isPinchToZoomEnabled: true,
        isGuidanceEnabled: true,
        isHighlightingEnabled: true,
      });
    } catch {}
  }, []);

  // Auto-launch modern scanner on native
  useEffect(() => {
    if (cameraReady && mode === 'barcode' && isModernScannerAvailable && !hasLaunchedScanner.current && !isWeb) {
      hasLaunchedScanner.current = true;
      const timer = setTimeout(() => launchModernScanner(), 500);
      return () => clearTimeout(timer);
    }
  }, [cameraReady, mode, launchModernScanner]);

  // Label capture — fixed for web (base64 extraction)
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
        // Auto-redirect to SAQ.com search instead of dead-end "not found"
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
    stopWebContinuousScan();
    setScanStatus('');
    setNotFoundQuery(null);
    setDetectedLabel(null);
  }, [stopWebContinuousScan]);

  const onCameraReady = useCallback(() => {
    setCameraReady(true);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      stopWebContinuousScan();
      try { CameraViewComponent?.dismissScanner?.(); } catch {}
    };
  }, [stopWebContinuousScan]);

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
        barcodeScannerSettings={mode === 'barcode' && !isWeb ? BARCODE_SETTINGS : undefined}
        onBarcodeScanned={mode === 'barcode' && !scanned && !isWeb ? handleBarcodeScan : undefined}
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
        {mode === 'barcode' && !scanned && !analyzing && (
          <View style={styles.scanLineWrap}>
            <View style={styles.scanLine} />
            <Text style={styles.scanHint}>
              {isWeb ? t.camera.webScanHint : t.camera.scanning}
            </Text>
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

      {/* Manual barcode input overlay */}
      {showManualInput && (
        <View style={styles.manualOverlay}>
          <Text style={styles.manualTitle}>{t.camera.manualTitle}</Text>
          <TextInput
            style={styles.manualInput}
            value={manualCode}
            onChangeText={setManualCode}
            placeholder={t.camera.manualPlaceholder}
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
              <Text style={styles.manualSubmitText}>{t.camera.manualSubmit}</Text>
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
            {/* Native: modern scanner button */}
            {!isWeb && isModernScannerAvailable && (
              <Pressable onPress={launchModernScanner} style={styles.scanActionBtn}>
                <Ionicons name="scan" size={28} color={COLORS.white} />
                <Text style={styles.scanActionText}>{t.camera.openScanner}</Text>
              </Pressable>
            )}

            {/* Web with BarcodeDetector: show status (scanning happens automatically) */}
            {isWeb && typeof (globalThis as any).BarcodeDetector !== 'undefined' && (
              <View style={styles.scanActionBtn}>
                <ActivityIndicator size="small" color={COLORS.white} />
                <Text style={styles.scanActionText}>{t.camera.scanning}</Text>
              </View>
            )}

            {/* Manual entry — always available */}
            <Pressable onPress={() => setShowManualInput(true)} style={styles.manualEntryLink}>
              <Ionicons name="keypad-outline" size={16} color={COLORS.white + 'CC'} />
              <Text style={styles.manualEntryText}>
                {t.camera.manualEntry}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.labelControls}>
            <Pressable onPress={handleLabelCapture} style={styles.captureBtn} disabled={analyzing}>
              <View style={[styles.captureInner, analyzing && { opacity: 0.5 }]} />
            </Pressable>
            <Text style={styles.captureHint}>
              {analyzing ? t.camera.analyzing : t.camera.capture}
            </Text>
          </View>
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
    paddingHorizontal: SPACING.md,
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
    minWidth: 180,
    justifyContent: 'center',
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
  labelControls: {
    alignItems: 'center',
    gap: SPACING.sm,
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
