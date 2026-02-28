import React, { useRef, useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { SAQ_TO_GEOJSON, GEOJSON_TO_SAQ } from '@/constants/countryMapping';
import { COLORS } from '@/constants/theme';

export interface RegionData {
  country: string;
  regions: { name: string; count: number; appellations: string[] }[];
}

interface LeafletMapProps {
  countries: { country: string; count: number }[];
  onCountryZoom: (country: string) => void;
  onCountryNavigate: (country: string) => void;
  onRegionPress: (country: string, region: string) => void;
  onBackToWorld: () => void;
  regionData?: RegionData | null;
  wineLabel?: string;
  translations?: {
    backToWorld: string;
    seeAllWines: string;
    loadingRegions: string;
    noRegions: string;
    wines: string;
    regions: string;
    mapLoading: string;
    mapError: string;
  };
}

const COUNTRY_FLAGS: Record<string, string> = {
  France: '\u{1F1EB}\u{1F1F7}', Italie: '\u{1F1EE}\u{1F1F9}', Espagne: '\u{1F1EA}\u{1F1F8}', Portugal: '\u{1F1F5}\u{1F1F9}',
  Argentine: '\u{1F1E6}\u{1F1F7}', Chili: '\u{1F1E8}\u{1F1F1}', 'États-Unis': '\u{1F1FA}\u{1F1F8}', Australie: '\u{1F1E6}\u{1F1FA}',
  'Nouvelle-Zélande': '\u{1F1F3}\u{1F1FF}', 'Afrique du Sud': '\u{1F1FF}\u{1F1E6}', Allemagne: '\u{1F1E9}\u{1F1EA}',
  Canada: '\u{1F1E8}\u{1F1E6}', Grèce: '\u{1F1EC}\u{1F1F7}', Hongrie: '\u{1F1ED}\u{1F1FA}', Autriche: '\u{1F1E6}\u{1F1F9}',
  Liban: '\u{1F1F1}\u{1F1E7}', Israël: '\u{1F1EE}\u{1F1F1}', Géorgie: '\u{1F1EC}\u{1F1EA}', Uruguay: '\u{1F1FA}\u{1F1FE}',
};

function generateLeafletHTML(
  countryData: { geoName: string; saqName: string; count: number }[],
  wineLabel: string,
  t: { backToWorld: string; seeAllWines: string; loadingRegions: string; noRegions: string; wines: string; regions: string; mapLoading: string; mapError: string },
): string {
  const maxCount = Math.max(...countryData.map((c) => c.count), 1);

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; background: ${COLORS.cream}; }
    .country-tooltip {
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 14px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      background: white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 2px solid ${COLORS.burgundy};
      color: ${COLORS.black};
    }
    .country-tooltip .count {
      font-size: 12px;
      color: ${COLORS.gray};
      font-weight: 400;
    }
    .leaflet-control-attribution { font-size: 10px !important; opacity: 0.6; }
    #loading {
      position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
      font-family: -apple-system, sans-serif; font-size: 14px; color: ${COLORS.gray};
      z-index: 1000;
    }
    #back-btn {
      display: none;
      position: absolute;
      top: 10px;
      left: 55px;
      z-index: 1000;
      background: white;
      border: none;
      border-radius: 8px;
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: ${COLORS.burgundy};
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    #back-btn:hover { background: ${COLORS.cream}; }
    #region-overlay {
      display: none;
      position: absolute;
      top: 10px;
      right: 10px;
      width: min(280px, 75vw);
      max-height: calc(100% - 24px);
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.18);
      z-index: 1000;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      display: none;
      flex-direction: column;
    }
    .overlay-header {
      padding: 14px 16px 6px;
      border-bottom: 1px solid #E5E5EA;
    }
    .overlay-title {
      font-size: 16px;
      font-weight: 700;
      color: ${COLORS.black};
    }
    .overlay-subtitle {
      font-size: 12px;
      color: ${COLORS.gray};
      padding: 4px 16px 8px;
    }
    .region-list {
      overflow-y: auto;
      flex: 1;
      padding: 2px 0;
    }
    .region-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 10px 16px;
      cursor: pointer;
      transition: background 0.15s;
      border-bottom: 1px solid #F2F2F7;
    }
    .region-item:last-child { border-bottom: none; }
    .region-item:hover { background: ${COLORS.cream}; }
    .region-name {
      font-size: 14px;
      font-weight: 500;
      color: ${COLORS.black};
      flex: 1;
      line-height: 1.3;
    }
    .region-count {
      font-size: 13px;
      font-weight: 700;
      color: ${COLORS.burgundy};
      margin-left: 8px;
      white-space: nowrap;
    }
    .region-appellations {
      font-size: 11px;
      color: ${COLORS.gray};
      margin-top: 2px;
      line-height: 1.3;
    }
    .see-all-btn {
      display: block;
      text-align: center;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 600;
      color: white;
      background: ${COLORS.burgundy};
      border: none;
      cursor: pointer;
      width: 100%;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
    }
    .see-all-btn:hover { opacity: 0.9; }
    .region-loading {
      padding: 30px 16px;
      text-align: center;
      font-size: 13px;
      color: ${COLORS.gray};
    }
  </style>
</head>
<body>
  <div id="loading">${t.mapLoading}</div>
  <div id="map"></div>
  <button id="back-btn" onclick="resetToWorld()">&larr; ${t.backToWorld}</button>
  <div id="region-overlay">
    <div class="overlay-header">
      <span class="overlay-title" id="overlay-title"></span>
    </div>
    <div class="overlay-subtitle" id="overlay-subtitle"></div>
    <div class="region-list" id="region-list">
      <div class="region-loading">${t.loadingRegions}</div>
    </div>
    <button class="see-all-btn" id="see-all-btn" onclick="onSeeAllClick()">${t.seeAllWines}</button>
  </div>
  <script>
    var WINE_COUNTRIES = ${JSON.stringify(countryData)};
    var MAX_COUNT = ${maxCount};
    var WINE_LABEL = ${JSON.stringify(wineLabel)};
    var COUNTRY_FLAGS = ${JSON.stringify(COUNTRY_FLAGS)};
    var T_LOADING = ${JSON.stringify(t.loadingRegions)};
    var T_NO_REGIONS = ${JSON.stringify(t.noRegions)};
    var T_SEE_ALL = ${JSON.stringify(t.seeAllWines)};
    var T_WINES = ${JSON.stringify(t.wines)};
    var T_REGIONS = ${JSON.stringify(t.regions)};
    var T_MAP_ERROR = ${JSON.stringify(t.mapError)};

    var countryLookup = {};
    WINE_COUNTRIES.forEach(function(c) { countryLookup[c.geoName] = c; });

    var currentZoomedCountry = null;
    var initialCenter = [30, 10];
    var initialZoom = 2;

    var map = L.map('map', {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 6,
      zoomControl: true,
      attributionControl: true,
      maxBounds: [[-85, -180], [85, 180]],
      maxBoundsViscosity: 1.0,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '\\u00a9 OpenStreetMap \\u00a9 CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    function getColor(count) {
      if (!count) return 'transparent';
      var ratio = count / MAX_COUNT;
      if (ratio > 0.7) return '${COLORS.burgundy}';
      if (ratio > 0.4) return '${COLORS.burgundyLight}';
      if (ratio > 0.15) return '${COLORS.gold}';
      return '${COLORS.goldLight}';
    }

    function featureStyle(feature) {
      var name = feature.properties.name;
      var data = countryLookup[name];
      if (data) {
        return {
          fillColor: getColor(data.count),
          weight: 2,
          opacity: 1,
          color: 'white',
          fillOpacity: 0.7,
          cursor: 'pointer',
        };
      }
      return {
        fillColor: '${COLORS.grayLight}',
        weight: 1,
        opacity: 0.3,
        color: 'white',
        fillOpacity: 0.15,
      };
    }

    var geojsonLayer;

    function highlightFeature(e) {
      var layer = e.target;
      var name = layer.feature.properties.name;
      if (countryLookup[name]) {
        layer.setStyle({ weight: 3, fillOpacity: 0.9 });
        if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
          layer.bringToFront();
        }
      }
    }

    function resetHighlight(e) {
      geojsonLayer.resetStyle(e.target);
    }

    function sendMessage(msg) {
      var str = JSON.stringify(msg);
      if (typeof window.ReactNativeWebView !== 'undefined') {
        window.ReactNativeWebView.postMessage(str);
      } else {
        window.parent.postMessage(str, '*');
      }
    }

    function onCountryClick(e) {
      var name = e.target.feature.properties.name;
      var data = countryLookup[name];
      if (!data) return;

      // Zoom to country
      var bounds = e.target.getBounds();
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 6, animate: true });
      currentZoomedCountry = data;

      // Show back button + overlay with loading
      document.getElementById('back-btn').style.display = 'block';
      var overlay = document.getElementById('region-overlay');
      overlay.style.display = 'flex';
      var flag = COUNTRY_FLAGS[data.saqName] || '';
      document.getElementById('overlay-title').textContent = flag + ' ' + data.saqName;
      document.getElementById('overlay-subtitle').textContent = '';
      document.getElementById('region-list').innerHTML = '<div class="region-loading">' + T_LOADING + '</div>';
      document.getElementById('see-all-btn').textContent = T_SEE_ALL + ' (' + data.count + ')';

      // Ask parent to fetch region data
      sendMessage({ type: 'countryZoom', geoName: name, saqName: data.saqName });
    }

    function showRegionData(data) {
      var list = document.getElementById('region-list');
      if (!data.regions || data.regions.length === 0) {
        list.innerHTML = '<div class="region-loading">' + T_NO_REGIONS + '</div>';
        return;
      }
      var totalWines = 0;
      data.regions.forEach(function(r) { totalWines += r.count; });
      document.getElementById('overlay-subtitle').textContent =
        data.regions.length + ' ' + T_REGIONS + ' \\u00b7 ' + totalWines + ' ' + T_WINES;

      var html = '';
      data.regions.forEach(function(r) {
        var appText = '';
        if (r.appellations && r.appellations.length > 0) {
          var shown = r.appellations.slice(0, 3).join(', ');
          if (r.appellations.length > 3) shown += '\\u2026';
          appText = '<div class="region-appellations">' + shown + '</div>';
        }
        var safeName = r.name.replace(/'/g, "\\\\'").replace(/"/g, '&quot;');
        html += '<div class="region-item" onclick="onRegionClick(\\'' + safeName + '\\')">' +
          '<div style="flex:1;min-width:0"><div class="region-name">' + r.name + '</div>' + appText + '</div>' +
          '<span class="region-count">' + r.count + '</span>' +
          '</div>';
      });
      list.innerHTML = html;
    }

    function onRegionClick(regionName) {
      if (!currentZoomedCountry) return;
      sendMessage({
        type: 'regionClick',
        saqName: currentZoomedCountry.saqName,
        region: regionName,
      });
    }

    function onSeeAllClick() {
      if (!currentZoomedCountry) return;
      sendMessage({
        type: 'countryClick',
        geoName: '',
        saqName: currentZoomedCountry.saqName,
      });
    }

    function resetToWorld() {
      map.flyTo(initialCenter, initialZoom, { duration: 0.8 });
      document.getElementById('back-btn').style.display = 'none';
      document.getElementById('region-overlay').style.display = 'none';
      currentZoomedCountry = null;
      sendMessage({ type: 'backToWorld' });
    }

    // Listen for region data from parent
    window.addEventListener('message', function(event) {
      try {
        var data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'regionData') {
          showRegionData(data);
        }
      } catch(e) {}
    });

    function onEachFeature(feature, layer) {
      var name = feature.properties.name;
      var data = countryLookup[name];
      if (data) {
        layer.bindTooltip(
          '<span>' + data.saqName + '</span><br><span class="count">' + data.count + ' ' + WINE_LABEL + '</span>',
          { className: 'country-tooltip', sticky: true }
        );
        layer.on({
          mouseover: highlightFeature,
          mouseout: resetHighlight,
          click: onCountryClick,
        });
      }
    }

    fetch('https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json')
      .then(function(r) { return r.json(); })
      .then(function(data) {
        document.getElementById('loading').style.display = 'none';
        geojsonLayer = L.geoJSON(data, {
          style: featureStyle,
          onEachFeature: onEachFeature,
        }).addTo(map);
      })
      .catch(function(err) {
        document.getElementById('loading').textContent = T_MAP_ERROR;
      });
  <\/script>
</body>
</html>`;
}

const DEFAULT_TRANSLATIONS = {
  backToWorld: 'World',
  seeAllWines: 'See all wines',
  loadingRegions: 'Loading regions...',
  noRegions: 'No regions found',
  wines: 'wines',
  regions: 'regions',
  mapLoading: 'Loading map...',
  mapError: 'Map loading error',
};

export default function LeafletMap({
  countries,
  onCountryZoom,
  onCountryNavigate,
  onRegionPress,
  onBackToWorld,
  regionData,
  wineLabel = 'wines',
  translations,
}: LeafletMapProps) {
  const onCountryZoomRef = useRef(onCountryZoom);
  onCountryZoomRef.current = onCountryZoom;
  const onCountryNavigateRef = useRef(onCountryNavigate);
  onCountryNavigateRef.current = onCountryNavigate;
  const onRegionPressRef = useRef(onRegionPress);
  onRegionPressRef.current = onRegionPress;
  const onBackToWorldRef = useRef(onBackToWorld);
  onBackToWorldRef.current = onBackToWorld;

  const iframeContainerRef = useRef<View>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const t = translations || DEFAULT_TRANSLATIONS;

  const countryDataForMap = countries
    .filter((c) => SAQ_TO_GEOJSON[c.country])
    .map((c) => ({
      geoName: SAQ_TO_GEOJSON[c.country],
      saqName: c.country,
      count: c.count,
    }));

  const html = generateLeafletHTML(countryDataForMap, wineLabel, t);

  // Web: send region data to iframe when it changes
  useEffect(() => {
    if (Platform.OS !== 'web' || !regionData || !iframeRef.current) return;
    const msg = JSON.stringify({ type: 'regionData', regions: regionData.regions });
    iframeRef.current.contentWindow?.postMessage(msg, '*');
  }, [regionData]);

  // Web: create iframe and listen for messages
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const container = iframeContainerRef.current as any;
    if (!container) return;
    const domNode: HTMLElement = container;

    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.srcdoc = html;
    domNode.appendChild(iframe);
    iframeRef.current = iframe;

    const handler = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data.type === 'countryZoom') {
          onCountryZoomRef.current(data.saqName);
        } else if (data.type === 'countryClick') {
          onCountryNavigateRef.current(data.saqName);
        } else if (data.type === 'regionClick') {
          onRegionPressRef.current(data.saqName, data.region);
        } else if (data.type === 'backToWorld') {
          onBackToWorldRef.current();
        }
      } catch {}
    };
    window.addEventListener('message', handler);

    return () => {
      window.removeEventListener('message', handler);
      iframeRef.current = null;
      if (domNode.contains(iframe)) domNode.removeChild(iframe);
    };
  }, [html]);

  if (Platform.OS === 'web') {
    return <View ref={iframeContainerRef} style={styles.container} />;
  }

  // Native: use WebView
  const NativeWebView = require('react-native-webview').WebView;
  const webViewRef = useRef<any>(null);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'countryZoom') {
        onCountryZoom(data.saqName);
      } else if (data.type === 'countryClick') {
        onCountryNavigate(data.saqName);
      } else if (data.type === 'regionClick') {
        onRegionPress(data.saqName, data.region);
      } else if (data.type === 'backToWorld') {
        onBackToWorld();
      }
    } catch {}
  };

  return (
    <NativeWebView
      ref={webViewRef}
      source={{ html }}
      style={styles.container}
      onMessage={handleMessage}
      javaScriptEnabled
      originWhitelist={['*']}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
