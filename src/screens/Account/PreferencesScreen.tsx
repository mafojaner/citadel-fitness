import { Pressable, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useThemeStore, type ThemeMode } from '../../state/themeStore';
import { useTheme } from '../../theme/useTheme';

const OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

export function PreferencesScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  return (
    <ScreenContainer>
      <Card title="Theme">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {OPTIONS.map((option) => {
            const active = option.value === mode;
            return (
              <Pressable
                key={option.value}
                onPress={() => setMode(option.value)}
                style={{
                  flex: 1,
                  paddingVertical: spacing.sm,
                  borderRadius: radius.pill,
                  alignItems: 'center',
                  backgroundColor: active ? colors.primary : colors.background,
                  borderWidth: 1,
                  borderColor: active ? colors.primary : colors.border,
                }}
              >
                <Text
                  style={[
                    typography.body,
                    { color: active ? colors.surface : colors.textSecondary, fontWeight: active ? '700' : '400' },
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Card title="Preferences">
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Units and notification preferences coming soon.
        </Text>
      </Card>
    </ScreenContainer>
  );
}
