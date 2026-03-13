import { Stack } from 'expo-router';
import { useTranslation } from '@/i18n';
import { useHeaderTheme } from '@/hooks/useThemeColors';
import HeaderIcons from '@/components/HeaderIcons';
import HeaderLogo from '@/components/HeaderLogo';

export default function HomeLayout() {
  const t = useTranslation();
  const { headerBg, headerTint } = useHeaderTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: headerBg },
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
