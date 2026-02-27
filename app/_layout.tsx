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
import { COLORS } from '@/constants/theme';
import 'react-native-reanimated';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

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
              <StatusBar style="light" />
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: COLORS.burgundy },
                  headerTintColor: COLORS.white,
                  headerTitleStyle: { fontWeight: '700' },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="wine/[id]" options={{ title: 'Détails du vin' }} />
                <Stack.Screen name="settings" options={{ title: 'Réglages' }} />
                <Stack.Screen name="cellar" options={{ title: 'Ma cave' }} />
                <Stack.Screen name="quiz" options={{ title: 'Quiz', presentation: 'modal' }} />
                <Stack.Screen name="camera" options={{ title: 'Scanner', headerShown: false }} />
                <Stack.Screen name="menu-scan" options={{ title: 'Menu' }} />
                <Stack.Screen name="map" options={{ title: 'Carte des vins' }} />
                <Stack.Screen name="country-wines" options={{ title: 'Vins' }} />
                <Stack.Screen name="wishlist" options={{ title: 'À essayer' }} />
              </Stack>
            </TasteProfileProvider>
            </WineNotesProvider>
            </WishlistProvider>
          </CellarProvider>
        </SearchHistoryProvider>
      </FavoritesProvider>
    </SettingsProvider>
  );
}
