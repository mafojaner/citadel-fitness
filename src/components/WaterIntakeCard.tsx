import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { IconWell } from './IconWell';
import { WaterProgressBar } from './WaterProgressBar';
import { QUICK_ADD_ML, formatWaterAmount, ozToMl } from '../lib/water';
import { useWaterIntake } from '../hooks/useWaterIntake';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';
import { iconInk } from '../theme/tokens';

/**
 * The card only ever needs one route, so it asks for one route rather than
 * for a particular stack's whole param list.
 *
 * It used to be typed against HomeStackParamList, which was accurate while
 * Home was the only screen rendering it and a lie the moment it moved. Any
 * stack that registers WaterHistory satisfies this, so the card can sit on
 * whichever screen it belongs to without the type following it around.
 */
type WaterCardNavigation = { WaterHistory: undefined };

/**
 * The blue is down to one thing: the level in the bar.
 *
 * This card used to be a solid blue slab, on the argument that it is a
 * thing you act on rather than a summary you read, and that the colour
 * marked the difference. The argument held while it was the only coloured
 * card on the screen. It stopped holding when the rest of the app went
 * monochrome and colour was given a single job -- saying what is paid for
 * -- because a saturated blue panel then read as the loudest thing on
 * Workouts while being the one card on it that costs nothing.
 *
 * What survives is the part that was carrying information rather than
 * emphasis. The bar is a measurement of water and it is drawn in the colour
 * of water, which is the same licence `danger` and `success` have.
 */

/**
 * Free, not Fortress — everyone gets hydration tracking. Lives on Home
 * because that's the daily-glance screen (same reasoning as the Activity
 * and Workout summary cards above it).
 */
export function WaterIntakeCard() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WaterCardNavigation>>();
  const unit = useProfileStore((s) => s.preferences.waterUnit);
  const goalMl = useProfileStore((s) => s.preferences.dailyWaterGoalMl);
  const { entries, totalMl, loading, error, mutating, addWater, removeLastEntry } = useWaterIntake();
  const [customOpen, setCustomOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');

  const progress = goalMl > 0 ? totalMl / goalMl : 0;
  const metGoal = totalMl >= goalMl && goalMl > 0;
  const presets = QUICK_ADD_ML[unit];

  const submitCustom = () => {
    const parsed = Number(customValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    addWater(Math.round(unit === 'ml' ? parsed : ozToMl(parsed)), 'custom');
    setCustomValue('');
    setCustomOpen(false);
  };

  return (
    <Card>
      <AnimatedPressable
        onPress={() => navigation.navigate('WaterHistory')}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${formatWaterAmount(totalMl, unit)} of ${formatWaterAmount(goalMl, unit)}${metGoal ? ', goal reached' : ''}. Tap to view hydration history and set your goal.`}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconWell icon="water" tint={iconInk.azure} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Water intake</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatWaterAmount(totalMl, unit)} of {formatWaterAmount(goalMl, unit)}
              {metGoal ? ' · goal reached' : ''}
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
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
          Tap to view history &amp; set your goal
        </Text>
      </AnimatedPressable>

      {/* No overrides now that the card is a neutral surface: the bar's own
          defaults are a border-grey track and a water-blue fill, which is
          exactly what it should be on a card like every other card. */}
      <WaterProgressBar progress={progress} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {presets.map((amountMl) => (
          <AnimatedPressable
            key={amountMl}
            onPress={() => addWater(amountMl)}
            disabled={mutating || loading}
            scaleTo={0.95}
            accessibilityRole="button"
            // The "+" is an icon, so the name would otherwise be bare
            // "250 ml" — a quantity, with no hint that pressing logs it.
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
              borderColor: colors.border,
              backgroundColor: colors.background,
            }}
          >
            <Ionicons name="add" size={14} color={colors.textPrimary} />
            <Text style={{ color: colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
              {formatWaterAmount(amountMl, unit)}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {customOpen ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            value={customValue}
            onChangeText={setCustomValue}
            onSubmitEditing={submitCustom}
            keyboardType="numeric"
            autoFocus
            placeholder={unit === 'ml' ? 'Amount in ml' : 'Amount in fl oz'}
            placeholderTextColor={colors.textMuted}
            style={{
              flex: 1,
              backgroundColor: colors.background,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.sm,
              color: colors.textPrimary,
            }}
          />
          <Pressable
            onPress={submitCustom}
            disabled={mutating}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add custom amount"
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: colors.ctaFill,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={18} color={colors.ctaText} />
          </Pressable>
          <Pressable
            onPress={() => {
              setCustomOpen(false);
              setCustomValue('');
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Cancel custom amount"
            style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ionicons name="close" size={18} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCustomOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Log a custom amount"
        >
          <Text style={{ color: colors.textSecondary, fontWeight: '600', fontSize: 13 }}>
            + Custom amount
          </Text>
        </Pressable>
      )}

      {error ? <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text> : null}
    </Card>
  );
}
