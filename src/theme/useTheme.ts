import { useColorScheme } from 'react-native';
import { useThemeStore } from '../state/themeStore';
import { darkColors, lightColors, radius, spacing, tierAccents, typography } from './tokens';

export function useTheme() {
  const systemScheme = useColorScheme();
  const mode = useThemeStore((s) => s.mode);
  // Narrowed to the two real schemes rather than passed through as
  // ColorSchemeName: the platform can report 'unspecified', and everything
  // downstream only ever means light or dark. Anything not explicitly dark
  // falls to light, which is the same default this had before.
  const scheme: 'light' | 'dark' = mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  // Exposed alongside `colors` rather than imported separately, so anything
  // drawing a tier gets the scheme-correct accent without having to
  // remember to pass `scheme` in — the mistake that would show up as an
  // invisible white card on a white page.
  const tiers = tierAccents(scheme);
  return { colors, tiers, spacing, radius, typography, scheme, mode };
}
