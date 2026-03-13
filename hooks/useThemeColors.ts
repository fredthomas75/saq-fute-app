import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { COLORS, COLORS_DARK, VIP_COLORS } from '@/constants/theme';

export function useThemeColors() {
  const { theme } = useSettings();
  const systemScheme = useColorScheme();

  const isDark =
    theme === 'dark' || (theme === 'auto' && systemScheme === 'dark');

  return isDark ? COLORS_DARK : COLORS;
}

export function useIsDark() {
  const { theme } = useSettings();
  const systemScheme = useColorScheme();
  return theme === 'dark' || (theme === 'auto' && systemScheme === 'dark');
}

/** Shared header theme — used by Tabs layout and (home) Stack layout */
export function useHeaderTheme() {
  const { vipMode } = useSettings();
  const isDark = useIsDark();
  const colors = useThemeColors();

  const headerBg = vipMode ? VIP_COLORS.bg : isDark ? colors.creamDark : COLORS.burgundy;
  const headerTint = vipMode ? COLORS.gold : isDark ? COLORS_DARK.black : COLORS.white;

  return { headerBg, headerTint };
}
