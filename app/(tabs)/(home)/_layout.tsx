import { Stack } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useThemeColors, useIsDark } from '@/hooks/useThemeColors';
import { COLORS, VIP_COLORS } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import HeaderIcons from '@/components/HeaderIcons';
import HeaderLogo from '@/components/HeaderLogo';

export default function HomeLayout() {
  const t = useTranslation();
  const colors = useThemeColors();
  const isDark = useIsDark();
  const { vipMode } = useSettings();

  const getHeaderBg = () => {
    if (vipMode) return VIP_COLORS.bg;
    if (isDark) return colors.creamDark;
    return COLORS.burgundy;
  };

  const headerTint = vipMode ? COLORS.gold : (isDark ? '#F5F5F5' : COLORS.white);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: getHeaderBg() },
        headerTintColor: headerTint,
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerTitle: '',
          headerLeft: () => <HeaderLogo />,
          headerRight: () => <HeaderIcons />,
        }}
      />
      <Stack.Screen
        name="wine/[id]"
        options={{
          title: t.wineDetail.title,
          headerBackTitle: t.common.back,
          headerRight: () => <HeaderIcons />,
        }}
      />
    </Stack>
  );
}
