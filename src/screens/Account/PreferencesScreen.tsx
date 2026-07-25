import { useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useThemeStore, type ThemeMode } from '../../state/themeStore';
import { gradients } from '../../theme/tokens';
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

const DISTANCE_UNIT_OPTIONS: { label: string; value: 'mi' | 'km' }[] = [
  { label: 'mi', value: 'mi' },
  { label: 'km', value: 'km' },
];

export function PreferencesScreen() {
  const { colors, spacing, typography } = useTheme();
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

  const onChangeDistanceUnit = async (distanceUnit: 'mi' | 'km') => {
    if (!userId || distanceUnit === preferences.distanceUnit) return;
    setError(null);
    try {
      await savePreferences(userId, { distanceUnit });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save distance unit');
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
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GradientIconBadge icon="color-palette" colors={gradients.calendar} size={32} />
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Theme</Text>
        </View>
        <SegmentedControl options={THEME_OPTIONS} value={mode} onChange={setMode} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GradientIconBadge icon="barbell" colors={gradients.volume} size={32} />
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Weight units</Text>
        </View>
        <SegmentedControl options={UNIT_OPTIONS} value={preferences.units} onChange={onChangeUnits} />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <GradientIconBadge icon="navigate" colors={gradients.pulse} size={32} />
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Distance units</Text>
        </View>
        <SegmentedControl
          options={DISTANCE_UNIT_OPTIONS}
          value={preferences.distanceUnit}
          onChange={onChangeDistanceUnit}
        />
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="notifications" colors={gradients.flame} size={32} />
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
