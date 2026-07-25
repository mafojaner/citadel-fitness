import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { Card } from '../../components/Card';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { saveWorkout } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

export function AddWorkoutScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { width } = useWindowDimensions();
  const { exercises: catalogue } = useExercises();
  const date = useWorkoutDraftStore((s) => s.date);
  const draftExercises = useWorkoutDraftStore((s) => s.exercises);
  const addSet = useWorkoutDraftStore((s) => s.addSet);
  const updateSet = useWorkoutDraftStore((s) => s.updateSet);
  const removeSet = useWorkoutDraftStore((s) => s.removeSet);
  const removeExercise = useWorkoutDraftStore((s) => s.removeExercise);
  const reset = useWorkoutDraftStore((s) => s.reset);
  const userId = useAuthStore((s) => s.session?.user.id);
  const units = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const finishedRef = useRef(false);

  const catalogueFor = (exerciseId: string) => catalogue.find((e) => e.id === exerciseId);
  const nameFor = (exerciseId: string) => catalogueFor(exerciseId)?.name ?? 'Exercise';
  const isCardio = (exerciseId: string) => catalogueFor(exerciseId)?.type === 'cardio';

  const finishAndLeave = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    reset();
    navigation.popToTop();
  };

  const onConfirm = async () => {
    if (!userId || draftExercises.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await saveWorkout(userId, date, draftExercises);
      finishedRef.current = false;
      setShowConfetti(true);
      setTimeout(finishAndLeave, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ScreenContainer>
      <Text style={[typography.caption, { color: colors.textMuted }]}>{date}</Text>

      {draftExercises.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No exercises added yet. Tap "+ Add exercise" to pick a movement from the catalogue.
          </Text>
        </Card>
      ) : (
        draftExercises.map((exercise) => {
          const cardio = isCardio(exercise.exerciseId);
          return (
            <Card key={exercise.id}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 }}>
                  <GradientIconBadge
                    icon={CATEGORY_ICONS[catalogueFor(exercise.exerciseId)?.category ?? ''] ?? DEFAULT_CATEGORY_ICON}
                    colors={
                      CATEGORY_GRADIENTS[catalogueFor(exercise.exerciseId)?.category ?? ''] ??
                      DEFAULT_CATEGORY_GRADIENT
                    }
                    size={36}
                  />
                  <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                    {nameFor(exercise.exerciseId)}
                  </Text>
                </View>
                <Pressable onPress={() => removeExercise(exercise.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Text style={[typography.caption, { color: colors.textMuted, width: 48 }]}>Set</Text>
                {cardio ? (
                  <>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                      Duration (min)
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                      Distance ({distanceUnit})
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>Reps</Text>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                      Weight ({units})
                    </Text>
                  </>
                )}
                <View style={{ width: 24 }} />
              </View>

              {exercise.sets.map((set) => (
                <View key={set.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 48 }}>
                    <View
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 13,
                        backgroundColor: colors.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>
                        {set.setNumber}
                      </Text>
                    </View>
                  </View>
                  {cardio ? (
                    <>
                      <TextInput
                        keyboardType="numeric"
                        value={set.durationMinutes === 0 ? '' : String(set.durationMinutes)}
                        onChangeText={(t) =>
                          updateSet(exercise.id, set.id, { durationMinutes: Number(t) || 0 })
                        }
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          color: colors.textPrimary,
                        }}
                      />
                      <TextInput
                        keyboardType="numeric"
                        value={set.distance === 0 ? '' : String(set.distance)}
                        onChangeText={(t) => updateSet(exercise.id, set.id, { distance: Number(t) || 0 })}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          color: colors.textPrimary,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <TextInput
                        keyboardType="numeric"
                        value={set.reps === 0 ? '' : String(set.reps)}
                        onChangeText={(t) => updateSet(exercise.id, set.id, { reps: Number(t) || 0 })}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          color: colors.textPrimary,
                        }}
                      />
                      <TextInput
                        keyboardType="numeric"
                        value={set.weight === 0 ? '' : String(set.weight)}
                        onChangeText={(t) => updateSet(exercise.id, set.id, { weight: Number(t) || 0 })}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          borderColor: colors.border,
                          borderWidth: 1,
                          borderRadius: radius.sm,
                          padding: spacing.sm,
                          color: colors.textPrimary,
                        }}
                      />
                    </>
                  )}
                  <Pressable onPress={() => removeSet(exercise.id, set.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addSet(exercise.id)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  + Add {cardio ? 'session' : 'set'}
                </Text>
              </Pressable>
            </Card>
          );
        })
      )}

      <Pressable
        onPress={() => navigation.navigate('ExerciseCatalogue')}
        style={({ pressed }) => ({
          borderColor: colors.primary,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Text style={{ color: colors.primary, fontWeight: '700' }}>+ Add exercise</Text>
      </Pressable>

      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <Pressable
        onPress={onConfirm}
        disabled={saving || draftExercises.length === 0}
        style={({ pressed }) => ({
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          opacity: pressed || saving || draftExercises.length === 0 ? 0.6 : 1,
        })}
      >
        <Text style={{ color: colors.surface, fontWeight: '700' }}>
          {saving ? 'Saving...' : 'Confirm'}
        </Text>
      </Pressable>
    </ScreenContainer>

    {showConfetti ? (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <ConfettiCannon
          count={120}
          origin={{ x: width / 2, y: -20 }}
          colors={[colors.primary, colors.success, '#FFD166', colors.primaryMuted]}
          fadeOut
          onAnimationEnd={finishAndLeave}
        />
      </View>
    ) : null}
    </>
  );
}
