import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { WaterGoalModal } from './WaterGoalModal';
import { WaterProgressBar } from './WaterProgressBar';
import { QUICK_ADD_ML, formatWaterAmount } from '../lib/water';
import { useWaterIntake } from '../hooks/useWaterIntake';
import { useAuthStore } from '../state/authStore';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';

/**
 * Solid blue, matching how Activity's RewardsCard is solid orange rather
 * than the neutral surface every other Home card uses — both are the one
 * thing on their screen that's really a call to action (log water / check
 * rewards) rather than a summary to glance at, and the color is what marks
 * that difference at a glance.
 */
const BLUE = '#3B82F6';

/**
 * Free, not Fortress — everyone gets hydration tracking. Lives on Home
 * because that's the daily-glance screen (same reasoning as the Activity
 * and Workout summary cards above it).
 */
export function WaterIntakeCard() {
  const { spacing, radius, typography } = useTheme();
  const userId = useAuthStore((s) => s.session?.user.id);
  const unit = useProfileStore((s) => s.preferences.waterUnit);
  const goalMl = useProfileStore((s) => s.preferences.dailyWaterGoalMl);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const { entries, totalMl, loading, error, mutating, addWater, removeLastEntry } = useWaterIntake();
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const progress = goalMl > 0 ? totalMl / goalMl : 0;
  const metGoal = totalMl >= goalMl && goalMl > 0;
  const presets = QUICK_ADD_ML[unit];

  const onSaveGoal = async (newGoalMl: number) => {
    if (!userId) return;
    await savePreferences(userId, { dailyWaterGoalMl: newGoalMl });
    setGoalModalOpen(false);
  };

  return (
    <View
      style={{
        backgroundColor: BLUE,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.sm,
        shadowColor: BLUE,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }}
    >
      <AnimatedPressable
        onPress={() => setGoalModalOpen(true)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${formatWaterAmount(totalMl, unit)} of ${formatWaterAmount(goalMl, unit)}${metGoal ? ', goal reached' : ''}. Tap to set daily goal.`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="water" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: '#FFFFFF' }]}>Water intake</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
              {formatWaterAmount(totalMl, unit)} of {formatWaterAmount(goalMl, unit)}
              {metGoal ? ' — goal reached' : ''}
            </Text>
          </View>
          {entries.length > 0 ? (
            <Pressable
              onPress={removeLastEntry}
              disabled={mutating}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Undo last water log"
            >
              <Ionicons name="arrow-undo" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
          ) : null}
        </View>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', fontWeight: '600' }]}>
          Tap to set daily goal
        </Text>
      </AnimatedPressable>

      <WaterProgressBar progress={progress} trackColor="rgba(255,255,255,0.25)" fillColor="#FFFFFF" />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {presets.map((amountMl) => (
          <AnimatedPressable
            key={amountMl}
            onPress={() => addWater(amountMl)}
            disabled={mutating || loading}
            scaleTo={0.95}
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

      {error ? <Text style={{ color: '#FFE1E1', fontSize: 12 }}>{error}</Text> : null}

      <WaterGoalModal
        visible={goalModalOpen}
        unit={unit}
        currentGoalMl={goalMl}
        onSave={onSaveGoal}
        onClose={() => setGoalModalOpen(false)}
      />
    </View>
  );
}
