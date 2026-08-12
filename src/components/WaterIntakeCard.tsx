import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { WaterProgressBar } from './WaterProgressBar';
import { QUICK_ADD_ML, formatWaterAmount } from '../lib/water';
import { useWaterIntake } from '../hooks/useWaterIntake';
import { useProfileStore } from '../state/profileStore';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

/**
 * Free, not Fortress — everyone gets hydration tracking. Lives on Home
 * because that's the daily-glance screen (same reasoning as the Activity
 * and Workout summary cards above it), with settings (unit, daily goal)
 * living in Account → Units alongside Weight and Distance rather than
 * cluttering this card with a config affordance.
 */
export function WaterIntakeCard() {
  const { colors, spacing, radius, typography } = useTheme();
  const unit = useProfileStore((s) => s.preferences.waterUnit);
  const goalMl = useProfileStore((s) => s.preferences.dailyWaterGoalMl);
  const { entries, totalMl, loading, error, mutating, addWater, removeLastEntry } = useWaterIntake();

  const progress = goalMl > 0 ? totalMl / goalMl : 0;
  const metGoal = totalMl >= goalMl && goalMl > 0;
  const presets = QUICK_ADD_ML[unit];

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <GradientIconBadge icon="water" colors={gradients.water} size={40} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[typography.subheading, { color: colors.textPrimary }]}>Water intake</Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
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
            <Ionicons name="arrow-undo" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <WaterProgressBar progress={progress} />

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
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
              {formatWaterAmount(amountMl, unit)}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </Card>
  );
}
