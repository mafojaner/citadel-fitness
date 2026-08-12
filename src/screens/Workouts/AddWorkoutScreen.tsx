import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { InfoNote } from '../../components/InfoNote';
import { FortressFeatureCard } from '../../components/FortressFeatureCard';
import { ScreenContainer } from '../../components/ScreenContainer';
import { WorkoutSavedAnimation } from '../../components/WorkoutSavedAnimation';
import {
  CATEGORY_GRADIENTS,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_GRADIENT,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { todayISO } from '../../lib/analytics';
import { partsToSeconds, secondsToParts } from '../../lib/units';
import { saveWorkout } from '../../lib/workouts';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

interface DurationInputGroupProps {
  totalSeconds: number;
  onChange: (totalSeconds: number) => void;
}

/** Hours/minutes/seconds entry for a cardio set's duration, composed into a single totalSeconds value. */
function DurationInputGroup({ totalSeconds, onChange }: DurationInputGroupProps) {
  const { colors, spacing, radius } = useTheme();
  const { hours, minutes, seconds } = secondsToParts(totalSeconds);

  const fieldStyle = {
    flex: 1,
    minWidth: 0,
    textAlign: 'center' as const,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.sm,
    padding: spacing.sm,
    color: colors.textPrimary,
  };

  return (
    <View style={{ flex: 1.4, flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <TextInput
        keyboardType="numeric"
        value={hours === 0 ? '' : String(hours)}
        onChangeText={(t) => onChange(partsToSeconds(Number(t) || 0, minutes, seconds))}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Hours"
        style={fieldStyle}
      />
      <Text style={{ color: colors.textMuted }}>:</Text>
      <TextInput
        keyboardType="numeric"
        value={minutes === 0 ? '' : String(minutes)}
        onChangeText={(t) => onChange(partsToSeconds(hours, Math.min(59, Number(t) || 0), seconds))}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Minutes"
        style={fieldStyle}
      />
      <Text style={{ color: colors.textMuted }}>:</Text>
      <TextInput
        keyboardType="numeric"
        value={seconds === 0 ? '' : String(seconds)}
        onChangeText={(t) => onChange(partsToSeconds(hours, minutes, Math.min(59, Number(t) || 0)))}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        accessibilityLabel="Seconds"
        style={fieldStyle}
      />
    </View>
  );
}

export function AddWorkoutScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
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
  const [showSuccess, setShowSuccess] = useState(false);
  const finishedRef = useRef(false);

  const catalogueFor = (exerciseId: string) => catalogue.find((e) => e.id === exerciseId);
  const nameFor = (exerciseId: string) => catalogueFor(exerciseId)?.name ?? 'Exercise';
  const isCardio = (exerciseId: string) => catalogueFor(exerciseId)?.type === 'cardio';
  // Timed exercises that don't cover ground — skipping, planks, boxing
  // rounds — shouldn't ask for a distance. Unknown ids fall back to true so
  // a not-yet-loaded catalogue doesn't hide a field that does apply.
  const tracksDistance = (exerciseId: string) => catalogueFor(exerciseId)?.tracksDistance ?? true;

  // An exercise added but never actually filled in (every set still at its
  // default zero) shouldn't be confirmable — it would still count toward
  // the streak and reward cycle despite recording nothing real.
  const hasMeaningfulData = draftExercises.some((exercise) => {
    const cardio = isCardio(exercise.exerciseId);
    return exercise.sets.some((set) =>
      cardio ? set.durationSeconds > 0 || set.distance > 0 : set.reps > 0 || set.weight > 0
    );
  });

  const finishAndLeave = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    reset();
    navigation.popToTop();
  };

  const onConfirm = async () => {
    if (!userId || draftExercises.length === 0 || !hasMeaningfulData) return;
    setSaving(true);
    setError(null);
    try {
      await saveWorkout(date, draftExercises, units, distanceUnit);
      finishedRef.current = false;
      setShowSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <ScreenContainer>
      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.textMuted }]}>{date}</Text>
        <InfoNote
          label="About this date"
          text={
            date === todayISO()
              ? "Log workout always adds to today. To add or edit a previous day, use the calendar on the Workouts tab."
              : `You're logging ${date} through the calendar. Since it wasn't logged the day it happened, it won't count toward your weekly reward.`
          }
        />
      </View>

      {draftExercises.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No exercises added yet. Tap &quot;+ Add exercise&quot; to pick a movement from the catalogue.
          </Text>
        </Card>
      ) : (
        draftExercises.map((exercise) => {
          const cardio = isCardio(exercise.exerciseId);
          const showDistance = cardio && tracksDistance(exercise.exerciseId);
          // Boxing is worked in rounds, not "sessions" or "sets".
          const entryNoun =
            catalogueFor(exercise.exerciseId)?.category === 'boxing' && cardio
              ? 'round'
              : cardio
                ? 'session'
                : 'set';
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
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1.4 }]}>
                      Duration (h : m : s)
                    </Text>
                    {showDistance ? (
                      <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                        Distance ({distanceUnit})
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>
                      Weight ({units})
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted, flex: 1 }]}>Reps</Text>
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
                      <DurationInputGroup
                        totalSeconds={set.durationSeconds}
                        onChange={(durationSeconds) =>
                          updateSet(exercise.id, set.id, { durationSeconds })
                        }
                      />
                      {showDistance ? (
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
                      ) : null}
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
                  <Pressable onPress={() => removeSet(exercise.id, set.id)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.textMuted} />
                  </Pressable>
                </View>
              ))}

              <Pressable onPress={() => addSet(exercise.id)}>
                <Text style={{ color: colors.primary, fontWeight: '600' }}>
                  + Add {entryNoun}
                </Text>
              </Pressable>
            </Card>
          );
        })
      )}

      <GradientButton
        label="+ Add exercise"
        variant="outline"
        onPress={() => navigation.navigate('ExerciseCatalogue')}
      />

      {draftExercises.length > 0 && !hasMeaningfulData ? (
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Enter at least one rep, weight, duration, or distance before confirming.
        </Text>
      ) : null}
      {error ? <Text style={{ color: colors.danger }}>{error}</Text> : null}

      <GradientButton
        label={saving ? 'Saving...' : 'Confirm'}
        loading={saving}
        disabled={draftExercises.length === 0 || !hasMeaningfulData}
        onPress={onConfirm}
      />

      {/* Only once something is being logged: on an empty draft this is an
          advert on a blank screen, but next to real sets it's showing where
          the suggestions will appear. Below Confirm so it never sits between
          the user and saving. */}
      {draftExercises.length > 0 ? <FortressFeatureCard featureId="ai-progressive-overload" /> : null}
    </ScreenContainer>

    {showSuccess ? <WorkoutSavedAnimation onDone={finishAndLeave} /> : null}
    </>
  );
}
