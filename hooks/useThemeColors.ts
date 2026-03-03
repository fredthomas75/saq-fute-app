import { useColorScheme } from 'react-native';
import { useSettings } from '@/context/SettingsContext';
import { COLORS, COLORS_DARK } from '@/constants/theme';

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
