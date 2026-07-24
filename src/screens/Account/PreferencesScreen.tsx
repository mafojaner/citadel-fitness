import { useState } from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useThemeStore, type ThemeMode } from '../../state/themeStore';
import { useTheme } from '../../theme/useTheme';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: 'System', value: 'system' },
  { label: 'Light', value: 'light' },
  { label: 'Dark', value: 'dark' },
];

const UNIT_OPTIONS: { label: string; value: 'lb' | 'kg' }[] = [
  { label: 'lb', value: 'lb' },
  { label: 'kg', value: 'kg' },
];

export function PreferencesScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const userId = useAuthStore((s) => s.session?.user.id);
  const preferences = useProfileStore((s) => s.preferences);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const [error, setError] = useState<string | null>(null);

  const onChangeUnits = async (units: 'lb' | 'kg') => {
    if (!userId || units === preferences.units) return;
    setError(null);
    try {
      await savePreferences(userId, { units });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save units');
    }
  };

  const onToggleNotifications = async (notifications: boolean) => {
    if (!userId) return;
    setError(null);
    try {
      await savePreferences(userId, { notifications });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save preference');
    }
  };

  return (
    <ScreenContainer>
      <Card title="Theme">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {THEME_OPTIONS.map((option) => {
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

      <Card title="Weight units">
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {UNIT_OPTIONS.map((option) => {
            const active = option.value === preferences.units;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChangeUnits(option.value)}
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

      <Card title="Notifications">
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
            Workout reminders
          </Text>
          <Switch
            value={preferences.notifications}
            onValueChange={onToggleNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.surface}
          />
        </View>
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
