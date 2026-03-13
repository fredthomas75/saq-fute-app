import { Stack } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useThemeColors, useIsDark } from '@/hooks/useThemeColors';
import { COLORS } from '@/constants/theme';
import HeaderIcons from '@/components/HeaderIcons';

export default function HomeLayout() {
  const t = useTranslation();
  const colors = useThemeColors();
  const isDark = useIsDark();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="wine/[id]"
        options={{
          headerShown: true,
          title: t.wineDetail.title,
          headerStyle: { backgroundColor: isDark ? colors.creamDark : COLORS.burgundy },
          headerTintColor: isDark ? '#F5F5F5' : '#FFFFFF',
          headerTitleStyle: { fontWeight: '700' },
          headerBackTitle: t.common.back,
          headerRight: () => <HeaderIcons />,
        }}
      />
    </Stack>
  );
}
