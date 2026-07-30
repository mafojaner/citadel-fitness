import { useState } from 'react';
import { Text } from 'react-native';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
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

export function UnitsScreen() {
  const { colors } = useTheme();
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

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}
    </ScreenContainer>
  );
}
