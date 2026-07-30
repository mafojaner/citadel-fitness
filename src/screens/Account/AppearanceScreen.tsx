import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useThemeStore, type ThemeMode } from '../../state/themeStore';
import { Text } from 'react-native';
import { useTheme } from '../../theme/useTheme';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function AppearanceScreen() {
  const { typography, colors } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <ScreenContainer>
      <Card>
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Choose how Citadel Fitness looks. System matches your device setting automatically.
        </Text>
        <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
      </Card>
    </ScreenContainer>
  );
}
