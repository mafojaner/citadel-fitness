import { useThemeStore } from '../state/themeStore';
import { useSystemScheme } from './systemScheme';
import { darkColors, lightColors, radius, spacing, tierAccents, typography } from './tokens';

export function useTheme() {
  // Not React Native's `useColorScheme`: that one only hears about a change
  // while the app is in the foreground, and changing the system theme means
  // leaving the app to do it. See systemScheme.ts.
  const systemScheme = useSystemScheme();
  const mode = useThemeStore((s) => s.mode);
  const scheme: 'light' | 'dark' = mode === 'system' ? systemScheme : mode;
  const colors = scheme === 'dark' ? darkColors : lightColors;
  // Exposed alongside `colors` rather than imported separately, so anything
  // drawing a tier gets the scheme-correct accent without having to
  // remember to pass `scheme` in — the mistake that would show up as an
  // invisible white card on a white page.
  const tiers = tierAccents(scheme);
  return { colors, tiers, spacing, radius, typography, scheme, mode };
}
