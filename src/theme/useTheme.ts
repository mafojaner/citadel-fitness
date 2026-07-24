import { useColorScheme } from 'react-native';
import { useThemeStore } from '../state/themeStore';
import { darkColors, lightColors, radius, spacing, typography } from './tokens';

export function useTheme() {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  const scheme = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  return { colors, spacing, radius, typography, scheme, mode };
}
