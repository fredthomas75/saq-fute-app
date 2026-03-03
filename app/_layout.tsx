import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { SearchHistoryProvider } from '@/context/SearchHistoryContext';
import { CellarProvider } from '@/context/CellarContext';

import { WishlistProvider } from '@/context/WishlistContext';
import { WineNotesProvider } from '@/context/WineNotesContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { COLORS } from '@/constants/theme';
import { useThemeColors, useIsDark } from '@/hooks/useThemeColors';
import { useTranslation } from '@/i18n';
import OfflineBanner from '@/components/OfflineBanner';
import ErrorBoundaryScreen from '@/components/ErrorBoundaryScreen';
import HeaderIcons from '@/components/HeaderIcons';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function StackNavigator() {
  const t = useTranslation();
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: isDark ? colors.creamDark : COLORS.burgundy },
        headerTintColor: isDark ? '#F5F5F5' : '#FFFFFF',
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: t.common.back,
        headerRight: () => <HeaderIcons />,
        animation: 'slide_from_right',
        animationDuration: 250,
        contentStyle: { backgroundColor: colors.cream },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: t.common.back }} />
      <Stack.Screen name="wine/[id]" options={{ title: t.wineDetail.title }} />
      <Stack.Screen name="camera" options={{ title: t.camera.title, headerShown: false }} />
      <Stack.Screen name="menu-scan" options={{ title: t.menuScan.title }} />
      <Stack.Screen name="country-wines" options={{ title: t.map.wines }} />
      <Stack.Screen name="coups-de-coeur" options={{ title: t.deals.coupDeCoeur }} />
      <Stack.Screen name="en-promo" options={{ title: t.deals.onSale }} />
      <Stack.Screen name="compare" options={{ title: t.compare.title }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SettingsProvider>
      <AuthProvider>
        <ToastProvider>
          <FavoritesProvider>
            <SearchHistoryProvider>
              <CellarProvider>
                <WishlistProvider>
                <WineNotesProvider>
                  <ErrorBoundaryScreen>
                    <StatusBar style="light" />
                    <OfflineBanner />
                    <StackNavigator />
                  </ErrorBoundaryScreen>
                </WineNotesProvider>
                </WishlistProvider>
              </CellarProvider>
            </SearchHistoryProvider>
          </FavoritesProvider>
        </ToastProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
