import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { FavoritesProvider } from '@/context/FavoritesContext';
import { SettingsProvider } from '@/context/SettingsContext';
import { SearchHistoryProvider } from '@/context/SearchHistoryContext';
import { CellarProvider } from '@/context/CellarContext';
import { TasteProfileProvider } from '@/context/TasteProfileContext';
import { WishlistProvider } from '@/context/WishlistContext';
import { WineNotesProvider } from '@/context/WineNotesContext';
import { ToastProvider } from '@/context/ToastContext';
import { COLORS } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

function StackNavigator() {
  const t = useTranslation();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.burgundy },
        headerTintColor: COLORS.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: t.common.back,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false, headerBackTitle: t.common.back }} />
      <Stack.Screen name="wine/[id]" options={{ title: t.wineDetail.title }} />
      <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      <Stack.Screen name="cellar" options={{ title: t.cellar.title }} />
      <Stack.Screen name="quiz" options={{ title: t.quiz.title, presentation: 'modal' }} />
      <Stack.Screen name="camera" options={{ title: t.camera.title, headerShown: false }} />
      <Stack.Screen name="menu-scan" options={{ title: t.menuScan.title }} />
      <Stack.Screen name="map" options={{ title: t.map.title }} />
      <Stack.Screen name="country-wines" options={{ title: t.map.wines }} />
      <Stack.Screen name="coups-de-coeur" options={{ title: t.deals.coupDeCoeur }} />
      <Stack.Screen name="en-promo" options={{ title: t.deals.onSale }} />
      <Stack.Screen name="wishlist" options={{ title: t.wishlist.title }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
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
      <FavoritesProvider>
        <SearchHistoryProvider>
          <CellarProvider>
            <WishlistProvider>
            <WineNotesProvider>
            <TasteProfileProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <StackNavigator />
            </ToastProvider>
            </TasteProfileProvider>
            </WineNotesProvider>
            </WishlistProvider>
          </CellarProvider>
        </SearchHistoryProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}
