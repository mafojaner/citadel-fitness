import { Text, View } from 'react-native';
import { OptionTiles, type OptionTile } from '../../components/OptionTiles';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useThemeStore, type ThemeMode } from '../../state/themeStore';
import { useTheme } from '../../theme/useTheme';

/**
 * Light first, then Dark, then System.
 *
 * The old order led with System, which is the sensible default but the least
 * illustrative thing to look at first: it has no appearance of its own, so
 * the row opened on the one option that cannot show you anything. Reading
 * light, dark, then "whichever of those your phone is doing" also matches
 * how the choice is actually described.
 */
const THEME_OPTIONS: readonly OptionTile<ThemeMode>[] = [
  { label: 'Light', value: 'light', icon: 'sunny-outline' },
  { label: 'Dark', value: 'dark', icon: 'moon-outline' },
  { label: 'System', value: 'system', icon: 'desktop-outline' },
];

export function AppearanceScreen() {
  const { colors, spacing, typography } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <ScreenContainer>
      {/* No Card around it. A settings pane that is one choice does not need
          a bordered box inside a bordered pane to say so, and the heading
          plus the tiles already group it. */}
      <View style={{ gap: spacing.md }}>
        <Text style={[typography.subheading, { color: colors.textPrimary }]}>Theme</Text>
        <OptionTiles options={THEME_OPTIONS} value={mode} onChange={setMode} />
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          System matches your device setting and follows it when it changes.
        </Text>
      </View>
    </ScreenContainer>
  );
}
