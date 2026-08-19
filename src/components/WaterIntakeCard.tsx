import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { WaterProgressBar } from './WaterProgressBar';
import { QUICK_ADD_ML, formatWaterAmount, ozToMl } from '../lib/water';
import { useWaterIntake } from '../hooks/useWaterIntake';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';
import { waterBlue } from '../theme/tokens';
import type { HomeStackParamList } from '../navigation/stacks/HomeStack';

/**
 * Solid blue, matching how Activity's RewardsCard is solid orange rather
 * than the neutral surface every other Home card uses — both are the one
 * thing on their screen that's really a call to action (log water / check
 * rewards) rather than a summary to glance at, and the color is what marks
 * that difference at a glance.
 */
const BLUE = waterBlue;

/**
 * Free, not Fortress — everyone gets hydration tracking. Lives on Home
 * because that's the daily-glance screen (same reasoning as the Activity
 * and Workout summary cards above it).
 */
export function WaterIntakeCard() {
  const { spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<HomeStackParamList>>();
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
        onPress={() => navigation.navigate('WaterHistory')}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={`${formatWaterAmount(totalMl, unit)} of ${formatWaterAmount(goalMl, unit)}${metGoal ? ', goal reached' : ''}. Tap to view hydration history and set your goal.`}
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
          Tap to view history &amp; set your goal
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

      {customOpen ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <TextInput
            value={customValue}
            onChangeText={setCustomValue}
            onSubmitEditing={submitCustom}
            keyboardType="numeric"
            autoFocus
            placeholder={unit === 'ml' ? 'Amount in ml' : 'Amount in fl oz'}
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
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
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
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => setCustomOpen(true)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Log a custom amount"
        >
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontWeight: '600', fontSize: 13 }}>
            + Custom amount
          </Text>
        </Pressable>
      )}

      {error ? <Text style={{ color: '#FFE1E1', fontSize: 12 }}>{error}</Text> : null}
    </View>
  );
}
