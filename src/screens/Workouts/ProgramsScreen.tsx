import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TierMark } from '../../components/TierMark';
import { StatChip } from '../../components/StatChip';
import { useArmedAction } from '../../hooks/useArmedAction';
import { useOpenActivityScreen } from '../../hooks/useOpenActivityScreen';
import { useProgramHistory } from '../../hooks/useProgramHistory';
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
  // Declared after usePrograms, whose `enrolled` it needs to decide whether
  // asking for a history is worth a round trip at all.
  const { history, moving, moveTo, reload: reloadHistory } = useProgramHistory(Boolean(enrolled));
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
      <TierMark />
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
          {/* Move the cycle by hand.
              The automatic advance handles the normal case; this is for
              training out of order or coming back from a missed week, where
              the only control used to be "leave", which throws the whole
              enrolment away. Every day in the cycle is offered, including
              the current one, so re-selecting it is a no-op rather than a
              trap. */}
          <View style={{ gap: spacing.xs }}>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Trained out of order? Jump the cycle:
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {enrolled.days.map((day) => (
                <GradientPill
                  key={day.id}
                  label={day.name}
                  active={day.position === today.position}
                  onPress={async () => {
                    if (moving) return;
                    await moveTo(day.position);
                    // Both: the enrolment supplies the next session, the
                    // history supplies what has been done against it, and a
                    // jump changes what the first of those says.
                    reload();
                    reloadHistory();
                  }}
                />
              ))}
            </View>
          </View>

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

      {enrolled && history.length > 0 ? (
        <Card title="Since you started">
          {/* Derived from logged workouts, not from a second table counting
              sessions -- which would drift the first time a workout was
              edited. It answers "have I actually been doing this", which
              "day 3 of 3" cannot. */}
          {history.map((session) => (
            <View
              key={session.date}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
            >
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}>
                {new Date(`${session.date}T00:00:00`).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {session.exercises} exercise{session.exercises === 1 ? '' : 's'} · {session.sets} set
                {session.sets === 1 ? '' : 's'}
              </Text>
            </View>
          ))}
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
