import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { WaterProgressBar } from '../../components/WaterProgressBar';
import { useWaterHistory } from '../../hooks/useWaterHistory';
import { useWaterIntake } from '../../hooks/useWaterIntake';
import { QUICK_ADD_ML, formatWaterAmount, mlToOz, ozToMl } from '../../lib/water';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { waterBlue } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatHistoryDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * The full-screen counterpart to WaterIntakeCard, reached by tapping it.
 * Sits on the app's normal background like every other screen — it's each
 * section that's solid blue, the same treatment RewardsCard gives its one
 * card on an otherwise neutral Activity screen, rather than re-theming the
 * whole page.
 */
export function WaterHistoryScreen() {
  const { spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const unit = useProfileStore((s) => s.preferences.waterUnit);
  const goalMl = useProfileStore((s) => s.preferences.dailyWaterGoalMl);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const { entries, totalMl, loading, error, mutating, addWater, removeEntry } = useWaterIntake();
  const { days, loading: historyLoading, error: historyError } = useWaterHistory();

  const [customValue, setCustomValue] = useState('');
  const [goalValue, setGoalValue] = useState(
    String(unit === 'ml' ? Math.round(goalMl) : Math.round(mlToOz(goalMl)))
  );
  const [goalTouched, setGoalTouched] = useState(false);
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState<string | null>(null);

  const progress = goalMl > 0 ? totalMl / goalMl : 0;
  const metGoal = totalMl >= goalMl && goalMl > 0;
  const presets = QUICK_ADD_ML[unit];

  const section = {
    backgroundColor: waterBlue,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
    shadowColor: waterBlue,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  };

  const submitCustom = () => {
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    addWater(Math.round(unit === 'ml' ? parsed : ozToMl(parsed)), 'custom');
    setCustomValue('');
  };

  const displayedGoalValue = goalTouched
    ? goalValue
    : String(unit === 'ml' ? Math.round(goalMl) : Math.round(mlToOz(goalMl)));
  const parsedGoal = Number(displayedGoalValue);
  const goalIsValid = displayedGoalValue.trim().length > 0 && Number.isFinite(parsedGoal) && parsedGoal > 0;
  const goalDirty = goalTouched && displayedGoalValue !== String(unit === 'ml' ? Math.round(goalMl) : Math.round(mlToOz(goalMl)));

  const onSaveGoal = async () => {
    if (!userId || !goalIsValid) return;
    setSavingGoal(true);
    setGoalError(null);
    try {
      const newGoalMl = unit === 'ml' ? parsedGoal : ozToMl(parsedGoal);
      await savePreferences(userId, { dailyWaterGoalMl: Math.round(newGoalMl) });
      setGoalTouched(false);
    } catch (err) {
      setGoalError(err instanceof Error ? err.message : 'Failed to save your goal');
    } finally {
      setSavingGoal(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={section}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <Text style={[typography.title, { color: '#FFFFFF' }]}>{formatWaterAmount(totalMl, unit)}</Text>
          <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)' }]}>
            of {formatWaterAmount(goalMl, unit)}
            {metGoal ? ' · goal reached' : ''}
          </Text>
        </View>
        <WaterProgressBar progress={progress} trackColor="rgba(255,255,255,0.25)" fillColor="#FFFFFF" />

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          {presets.map((amountMl) => (
            <AnimatedPressable
              key={amountMl}
              onPress={() => addWater(amountMl)}
              disabled={mutating || loading}
              scaleTo={0.95}
              accessibilityRole="button"
              accessibilityLabel={`Add ${formatWaterAmount(amountMl, unit)}`}
              accessibilityState={{ disabled: mutating || loading }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.35)',
                backgroundColor: 'rgba(255,255,255,0.15)',
              }}
            >
              <Ionicons name="add" size={14} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13 }}>
                {formatWaterAmount(amountMl, unit)}
              </Text>
            </AnimatedPressable>
          ))}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            value={customValue}
            onChangeText={setCustomValue}
            onSubmitEditing={submitCustom}
            keyboardType="numeric"
            placeholder={unit === 'ml' ? 'Custom amount in ml' : 'Custom amount in fl oz'}
            placeholderTextColor="rgba(255,255,255,0.6)"
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.35)',
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.sm,
              color: '#FFFFFF',
            }}
          />
          <Pressable
            onPress={submitCustom}
            disabled={mutating}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add custom amount"
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {error ? <Text style={{ color: '#FFE1E1', fontSize: 12 }}>{error}</Text> : null}
      </View>

      <View style={section}>
        <Text style={[typography.subheading, { color: '#FFFFFF' }]}>Daily hydration limit</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            value={displayedGoalValue}
            onChangeText={(t) => {
              setGoalTouched(true);
              setGoalValue(t);
            }}
            keyboardType="numeric"
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.15)',
              borderColor: 'rgba(255,255,255,0.35)',
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              color: '#FFFFFF',
              fontSize: 18,
              fontWeight: '700',
            }}
          />
          <Text style={{ color: 'rgba(255,255,255,0.85)' }}>{unit === 'ml' ? 'ml' : 'fl oz'}</Text>
        </View>
        {goalDirty ? (
          <GradientButton
            label={savingGoal ? 'Saving...' : 'Save goal'}
            loading={savingGoal}
            disabled={!goalIsValid}
            onPress={onSaveGoal}
          />
        ) : null}
        {goalError ? <Text style={{ color: '#FFE1E1', fontSize: 12 }}>{goalError}</Text> : null}
      </View>

      <View style={section}>
        <Text style={[typography.subheading, { color: '#FFFFFF' }]}>Today&apos;s log</Text>
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : entries.length === 0 ? (
          <Text style={[typography.body, { color: 'rgba(255,255,255,0.75)' }]}>
            Nothing logged yet today.
          </Text>
        ) : (
          [...entries].reverse().map((entry) => (
            <View
              key={entry.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingVertical: spacing.xs,
              }}
            >
              <Text style={[typography.body, { color: '#FFFFFF' }]}>{formatWaterAmount(entry.amountMl, unit)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <Text style={[typography.caption, { color: 'rgba(255,255,255,0.7)' }]}>
                  {formatTime(entry.createdAt)}
                </Text>
                <Pressable
                  onPress={() => removeEntry(entry.id)}
                  disabled={mutating}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${formatWaterAmount(entry.amountMl, unit)} entry`}
                >
                  <Ionicons name="trash-outline" size={16} color="rgba(255,255,255,0.7)" />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={section}>
        <Text style={[typography.subheading, { color: '#FFFFFF' }]}>Hydration history</Text>
        {historyLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : historyError ? (
          <Text style={{ color: '#FFE1E1', fontSize: 12 }}>{historyError}</Text>
        ) : days.length === 0 ? (
          <Text style={[typography.body, { color: 'rgba(255,255,255,0.75)' }]}>
            Your past days will show up here once you&apos;ve logged water on more than one day.
          </Text>
        ) : (
          days.map((day) => {
            const dayMetGoal = goalMl > 0 && day.totalMl >= goalMl;
            return (
              <View
                key={day.date}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing.xs,
                }}
              >
                <Text style={[typography.body, { color: '#FFFFFF' }]}>{formatHistoryDate(day.date)}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Text style={[typography.body, { color: 'rgba(255,255,255,0.85)' }]}>
                    {formatWaterAmount(day.totalMl, unit)}
                  </Text>
                  {dayMetGoal ? <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" /> : null}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
