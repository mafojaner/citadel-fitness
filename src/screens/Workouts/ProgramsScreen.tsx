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
import { usePrograms } from '../../hooks/usePrograms';
import { todayISO } from '../../lib/analytics';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

/**
 * A program answers one question — what am I doing today — and then gets
 * out of the way by writing that session straight into the workout draft.
 * The cycle advances on load rather than on save, so a session started is a
 * session moved past; re-loading the same day would otherwise be the
 * easiest way to get stuck repeating it.
 */
export function ProgramsScreen() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const { programs, enrolled, today, loading, busy, error, reload, join, leave, advance } =
    usePrograms();
  const loadFromProgram = useWorkoutDraftStore((s) => s.loadFromProgram);

  const startSession = async () => {
    if (!today) return;
    loadFromProgram(
      todayISO(),
      today.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      }))
    );
    await advance();
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
          <GradientButton label="Leave program" variant="outline" onPress={leave} />
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
