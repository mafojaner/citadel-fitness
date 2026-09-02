import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { StatChip } from '../../components/StatChip';
import { useArmedAction } from '../../hooks/useArmedAction';
import { useOpenActivityScreen } from '../../hooks/useOpenActivityScreen';
import { usePrograms } from '../../hooks/usePrograms';
import { todayISO } from '../../lib/analytics';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

/**
 * A program answers one question — what am I doing today — and then gets
 * out of the way by writing that session straight into the workout draft.
 *
 * The cycle advances when that session is *saved*, not when it is loaded.
 * It used to advance on load, on the reasoning that a session started is a
 * session moved past. That reads well and behaves badly: loading a day and
 * not finishing it is completely ordinary — you check what today is and get
 * pulled away — and each of those silently burned a day, with nothing in
 * the interface able to step back. The position now rides along with the
 * draft and is spent when the workout lands. Re-loading the same day before
 * saving is now harmless rather than the thing being guarded against.
 */
export function ProgramsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const openActivityScreen = useOpenActivityScreen();
  const { programs, enrollment, enrolled, today, loading, busy, error, reload, join, leave } =
    usePrograms();
  // Two taps to leave, because one tap throws away your place in the cycle
  // and this button sits directly under the one you press every session.
  // The shared hook also disarms after a few seconds -- the first version of
  // this stayed armed indefinitely, so a tap, a distraction and a return
  // meant the next tap was destructive with no warning it had been primed.
  const { armed: confirmingLeave, trigger: triggerLeave } = useArmedAction(leave);
  const loadFromProgram = useWorkoutDraftStore((s) => s.loadFromProgram);

  const startSession = () => {
    if (!today || !enrollment || !enrolled) return;
    loadFromProgram(
      todayISO(),
      today.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
      // Handed to the draft rather than acted on now. Saving the workout is
      // what spends it; see the note on this screen and on programAdvance.
      { position: enrollment.nextPosition, cycleLength: enrolled.days.length }
    );
    navigation.navigate('AddWorkout');
  };

  if (loading) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {enrolled && today ? (
        <Card title="Your next session">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="calendar-number" colors={gradients.calendar} size={44} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {today.name}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {enrolled.name} · day {today.position} of {enrolled.days.length}
              </Text>
            </View>
          </View>

          <View style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            {today.exercises.map((exercise) => (
              <View
                key={exercise.exerciseId}
                style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
              >
                <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                  {exercise.exerciseName}
                </Text>
                <StatChip
                  icon="repeat-outline"
                  value={`${exercise.targetSets} × ${exercise.targetReps}`}
                />
              </View>
            ))}
          </View>

          <GradientButton
            label={busy ? 'Loading...' : 'Load into today’s workout'}
            loading={busy}
            onPress={startSession}
          />

          {/* The seam between two Fortress features that had none.
              Committing to a training block is precisely the moment someone
              has a number in mind, and goal forecasting sat two tabs away
              with nothing pointing at it. Offered rather than imposed: a
              program is a plan for the next few weeks, and not everyone
              running one wants a target on top of it. */}
          <GradientButton
            label="Set a target on one of these lifts"
            variant="outline"
            onPress={() => openActivityScreen('GoalForecast')}
          />
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            The program moves to day {(today.position % enrolled.days.length) + 1} once
            you save this session, not now — so loading it to look is free.
          </Text>
          <GradientButton
            label={confirmingLeave ? 'Tap again to leave' : 'Leave program'}
            variant="outline"
            onPress={triggerLeave}
          />
        </Card>
      ) : null}

      <Text style={[typography.subheading, { color: colors.textPrimary }]}>
        {enrolled ? 'Switch program' : 'Choose a program'}
      </Text>

      {programs.map((program) => {
        const isCurrent = program.id === enrolled?.id;
        return (
          <Card key={program.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                {program.name}
              </Text>
              {isCurrent ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {program.description}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {program.days.map((day) => (
                <StatChip key={day.id} icon="barbell-outline" value={day.name} />
              ))}
            </View>
            {!isCurrent ? (
              <GradientButton
                label={enrolled ? 'Switch to this' : 'Start this program'}
                variant="outline"
                disabled={busy}
                onPress={() => join(program.id)}
              />
            ) : null}
          </Card>
        );
      })}

      {programs.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No programs available yet.
          </Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
