import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { PlainButton } from '../../components/PlainButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { mlToOz, ozToMl } from '../../lib/water';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';

const UNIT_OPTIONS: { label: string; value: 'lb' | 'kg' }[] = [
  { label: 'lb', value: 'lb' },
  { label: 'kg', value: 'kg' },
];

const DISTANCE_UNIT_OPTIONS: { label: string; value: 'mi' | 'km' }[] = [
  { label: 'mi', value: 'mi' },
  { label: 'km', value: 'km' },
];

const WATER_UNIT_OPTIONS: { label: string; value: 'oz' | 'ml' }[] = [
  { label: 'fl oz', value: 'oz' },
  { label: 'ml', value: 'ml' },
];

export function UnitsScreen() {
  const { colors, spacing, radius } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const preferences = useProfileStore((s) => s.preferences);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const [error, setError] = useState<string | null>(null);

  // Same override pattern as the name field in ProfileSettingsScreen: track
  // only what's actually been typed, and fall back to the stored value
  // (converted to whichever unit is currently selected) until it has. That
  // fallback is what makes toggling oz/ml re-render the box in the new
  // unit instead of leaving whatever number was showing before the switch.
  const storedGoalInUnit =
    preferences.waterUnit === 'ml'
      ? Math.round(preferences.dailyWaterGoalMl)
      : Math.round(mlToOz(preferences.dailyWaterGoalMl));
  const [goalOverride, setGoalOverride] = useState<string | null>(null);
  const goalInputValue = goalOverride ?? String(storedGoalInUnit);
  const parsedGoal = Number(goalInputValue);
  const goalIsValid = goalInputValue.trim().length > 0 && Number.isFinite(parsedGoal) && parsedGoal > 0;
  const goalDirty = goalOverride !== null && goalOverride !== String(storedGoalInUnit);
  const [savingGoal, setSavingGoal] = useState(false);

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

  const onChangeWaterUnit = async (waterUnit: 'oz' | 'ml') => {
    if (!userId || waterUnit === preferences.waterUnit) return;
    setError(null);
    try {
      await savePreferences(userId, { waterUnit });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save water unit');
    }
  };

  const onSaveGoal = async () => {
    if (!userId || !goalIsValid) return;
    // Storage is always ml regardless of which unit the goal was entered
    // in, same as amount_ml on each logged entry — one canonical unit so
    // nothing downstream has to know which unit a given number came from.
    const goalMl = preferences.waterUnit === 'ml' ? parsedGoal : ozToMl(parsedGoal);
    setSavingGoal(true);
    setError(null);
    try {
      await savePreferences(userId, { dailyWaterGoalMl: Math.round(goalMl) });
      setGoalOverride(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save daily goal');
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <ScreenContainer>
      <Card title="Weight">
        <SegmentedControl options={UNIT_OPTIONS} value={preferences.units} onChange={onChangeUnits} />
      </Card>

      <Card title="Distance">
        <SegmentedControl
          options={DISTANCE_UNIT_OPTIONS}
          value={preferences.distanceUnit}
          onChange={onChangeDistanceUnit}
        />
      </Card>

      <Card title="Water">
        <SegmentedControl
          options={WATER_UNIT_OPTIONS}
          value={preferences.waterUnit}
          onChange={onChangeWaterUnit}
        />

        <Text style={{ color: colors.textMuted, fontSize: 13 }}>Daily goal</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            value={goalInputValue}
            onChangeText={setGoalOverride}
            keyboardType="numeric"
            placeholder={String(storedGoalInUnit)}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.textPrimary,
            }}
          />
          <Text style={{ color: colors.textSecondary }}>{preferences.waterUnit === 'ml' ? 'ml' : 'fl oz'}</Text>
        </View>
        {goalDirty ? (
          <PlainButton
            label={savingGoal ? 'Saving...' : 'Save goal'}
            loading={savingGoal}
            disabled={!goalIsValid}
            onPress={onSaveGoal}
          />
        ) : null}
      </Card>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
