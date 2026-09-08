import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CardHead } from '../../components/CardHead';
import { Disclosure } from '../../components/Disclosure';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FadeInView } from '../../components/FadeInView';
import { GradientButton } from '../../components/GradientButton';
import { GradientPill } from '../../components/GradientPill';
import { IconWell } from '../../components/IconWell';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TierMark } from '../../components/TierMark';
import { StatBlock } from '../../components/analytics/StatBlock';
import { StatGrid } from '../../components/analytics/StatGrid';
import {
  CATEGORY_ICONS,
  CATEGORY_INK,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_CATEGORY_INK,
} from '../../constants/categories';
import { useArmedAction } from '../../hooks/useArmedAction';
import { useExercises } from '../../hooks/useExercises';
import { useOpenActivityScreen } from '../../hooks/useOpenActivityScreen';
import { useProgramHistory } from '../../hooks/useProgramHistory';
import { usePrograms } from '../../hooks/usePrograms';
import { todayISO } from '../../lib/analytics';
import type { ProgramDayExercise } from '../../lib/programs';
import { useWorkoutDraftStore } from '../../state/workoutDraftStore';
import { useTheme } from '../../theme/useTheme';
import { iconInk } from '../../theme/tokens';
import type { WorkoutsStackParamList } from '../../navigation/stacks/WorkoutsStack';

/**
 * One-tap conditioning, by catalogue name.
 *
 * The screen had no way to vary a session at all: the programme prescribed
 * what it prescribed, and someone who wanted to finish with ten minutes on
 * the rower had to load the day, save it, and log the cardio as a second
 * workout. These append to the session before it is loaded, which is the
 * cheapest possible answer to "what if I want to add cardio" -- and cheap
 * matters, because this is the kind of thing decided on the gym floor.
 *
 * Matched by name against the catalogue rather than held as ids, since ids
 * are per-database and this file is not.
 */
const FINISHERS = ['Rowing', 'Skipping (Jump Rope)', 'Incline Treadmill Walk', 'Assault Bike'];

const STAGGER_MS = 70;

function Section({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <FadeInView slideDistance={12} duration={Math.min(index * STAGGER_MS, 350) + 260}>
      {children}
    </FadeInView>
  );
}

/**
 * Where you are in the cycle, as one row of segments.
 *
 * The old screen said "day 2 of 3" and left the rest to arithmetic. A
 * programme is a loop, and the useful thing to see is the shape of that
 * loop with your place marked on it -- how much of it is behind you, what
 * comes next, and that it wraps.
 */
function CycleTrack({ length, position }: { length: number; position: number }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs }}>
      {Array.from({ length }, (_, i) => {
        const day = i + 1;
        const isNow = day === position;
        return (
          <View
            key={day}
            style={{
              flex: 1,
              height: 6,
              borderRadius: radius.pill,
              backgroundColor: isNow ? iconInk.ember : day < position ? colors.textMuted : colors.border,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * The programme screen, built around the one question it exists to answer:
 * what am I lifting today.
 *
 * That answer used to share a card with six other things -- the cycle jump,
 * a goal shortcut, an explanation of when the cycle advances, a leave
 * button -- none of them ranked against it, and below that a session
 * history and every programme in the catalogue printed in full. The session
 * is what someone comes here for every time; the rest is occasional, and
 * occasional things are behind a line now rather than in the way.
 */
export function ProgramsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<WorkoutsStackParamList>>();
  const openActivityScreen = useOpenActivityScreen();
  const { programs, enrollment, enrolled, today, loading, busy, error, reload, join, leave } =
    usePrograms();
  const { history, moving, moveTo, reload: reloadHistory } = useProgramHistory(Boolean(enrolled));
  const { exercises } = useExercises();
  // Two taps to leave, because one tap throws away your place in the cycle.
  // The shared hook also disarms after a few seconds -- the first version
  // stayed armed indefinitely, so a tap, a distraction and a return meant
  // the next tap was destructive with no warning it had been primed.
  const { armed: confirmingLeave, trigger: triggerLeave } = useArmedAction(leave);
  const loadFromProgram = useWorkoutDraftStore((s) => s.loadFromProgram);

  /**
   * Changes to this session only, never to the programme.
   *
   * Programme rows are shared reference data -- every member on Push /
   * Pull / Legs reads the same ones -- so "not doing that today" and
   * "finishing on the rower" cannot be writes. They are held here and
   * folded in at the moment the day is handed to the draft, which is the
   * only place the distinction stops mattering.
   */
  const dayKey = today?.id ?? null;
  /**
   * Stamped with the day they belong to, rather than cleared when it
   * changes. Reading them back through `edits.dayId === dayKey` means a
   * jump in the cycle drops yesterday's edits with no effect to run, no
   * cascading render, and no window where the previous day's changes are
   * briefly applied to the new one.
   */
  const [edits, setEdits] = useState<{
    dayId: string | null;
    dropped: string[];
    added: ProgramDayExercise[];
  }>({ dayId: null, dropped: [], added: [] });

  const active =
    edits.dayId === dayKey ? edits : { dayId: dayKey, dropped: [], added: [] as ProgramDayExercise[] };
  const { dropped, added } = active;

  const drop = (exerciseId: string) =>
    setEdits({ ...active, dayId: dayKey, dropped: [...active.dropped, exerciseId] });
  const unadd = (exerciseId: string) =>
    setEdits({ ...active, dayId: dayKey, added: active.added.filter((a) => a.exerciseId !== exerciseId) });
  const add = (exercise: ProgramDayExercise) =>
    setEdits({ ...active, dayId: dayKey, added: [...active.added, exercise] });

  const sessionExercises: ProgramDayExercise[] = [
    ...(today?.exercises ?? []).filter((e) => !dropped.includes(e.exerciseId)),
    ...added,
  ];

  const finishers = FINISHERS.map((name) => exercises.find((e) => e.name === name)).filter(
    (e): e is NonNullable<typeof e> => Boolean(e)
  );

  const startSession = () => {
    if (!today || !enrollment || !enrolled || sessionExercises.length === 0) return;
    loadFromProgram(
      todayISO(),
      sessionExercises.map((e) => ({
        exerciseId: e.exerciseId,
        targetSets: e.targetSets,
        targetReps: e.targetReps,
      })),
      // Handed to the draft rather than acted on now. Saving the workout is
      // what spends it; see the note on programAdvance.
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

  let section = 0;

  return (
    <ScreenContainer>
      <TierMark />
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {enrolled && today ? (
        <>
          {/* The session. Everything above the fold answers what is being
              logged, and nothing else competes for that space. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="calendar-number"
                tint={iconInk.ember}
                title={today.name}
                detail={`${enrolled.name} · day ${today.position} of ${enrolled.days.length}`}
              />

              <CycleTrack length={enrolled.days.length} position={today.position} />

              <View style={{ gap: spacing.xs }}>
                {sessionExercises.map((exercise) => (
                  <View
                    key={exercise.exerciseId}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.sm,
                      paddingVertical: 6,
                    }}
                  >
                    <IconWell
                      icon={CATEGORY_ICONS[exercise.category] ?? DEFAULT_CATEGORY_ICON}
                      size={30}
                      tint={CATEGORY_INK[exercise.category] ?? DEFAULT_CATEGORY_INK}
                    />
                    <Text
                      style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}
                      numberOfLines={1}
                    >
                      {exercise.exerciseName}
                    </Text>
                    {/* Sets and reps mean nothing for a run, and the table
                        stores 1 x 1 for one. Saying "Duration" is the
                        honest version of a number that is not there. */}
                    <Text
                      style={[
                        typography.caption,
                        { color: colors.textMuted, fontWeight: '700', fontVariant: ['tabular-nums'] },
                      ]}
                    >
                      {exercise.type === 'cardio'
                        ? 'Duration'
                        : `${exercise.targetSets} × ${exercise.targetReps}`}
                    </Text>
                    <Pressable
                      onPress={() =>
                        added.some((a) => a.exerciseId === exercise.exerciseId)
                          ? unadd(exercise.exerciseId)
                          : drop(exercise.exerciseId)
                      }
                      hitSlop={10}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${exercise.exerciseName} from this session`}
                      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
                    >
                      <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))}

                {sessionExercises.length === 0 ? (
                  <Text style={[typography.body, { color: colors.textSecondary }]}>
                    Nothing left in this session. Add a finisher below, or put one back by
                    reopening the day.
                  </Text>
                ) : null}
              </View>

              {/* Conditioning, one tap. The programme is a starting point,
                  not a cage -- and this is the variation people actually
                  want on the day. */}
              {finishers.length > 0 ? (
                <View style={{ gap: spacing.xs }}>
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Add a finisher
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                    {finishers.map((exercise) => {
                      const on = sessionExercises.some((e) => e.exerciseId === exercise.id);
                      return (
                        <AnimatedPressable
                          key={exercise.id}
                          scaleTo={0.94}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={`${on ? 'Remove' : 'Add'} ${exercise.name}`}
                          onPress={() =>
                            on
                              ? unadd(exercise.id)
                              : add({
                                  exerciseId: exercise.id,
                                  exerciseName: exercise.name,
                                  position: 99 + added.length,
                                  targetSets: 1,
                                  targetReps: 1,
                                  type: 'cardio',
                                  category: exercise.category,
                                })
                          }
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            paddingHorizontal: spacing.sm,
                            paddingVertical: 6,
                            borderRadius: radius.pill,
                            borderWidth: 1,
                            borderColor: on ? colors.textPrimary : colors.border,
                            backgroundColor: on ? colors.textPrimary : 'transparent',
                          }}
                        >
                          <Ionicons
                            name={on ? 'checkmark' : 'add'}
                            size={13}
                            color={on ? colors.surface : colors.textMuted}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: '700',
                              color: on ? colors.surface : colors.textPrimary,
                            }}
                          >
                            {exercise.name}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}

              <GradientButton
                label={busy ? 'Loading...' : 'Start session'}
                loading={busy}
                disabled={sessionExercises.length === 0}
                onPress={startSession}
              />

              <Text style={[typography.caption, { color: colors.textMuted }]}>
                The cycle moves to day {(today.position % enrolled.days.length) + 1} when you save
                this session, not now — so opening it to look is free.
              </Text>

              {/* Everything that is not "what am I lifting today". Each of
                  these was a permanent block on the old screen. */}
              <Disclosure label="Programme tools" hint="Jump the cycle, goals, leave" icon="options-outline">
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
                          // Both: the enrolment supplies the next session,
                          // the history supplies what has been done against
                          // it, and a jump changes what the first says.
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
                <GradientButton
                  label={confirmingLeave ? 'Tap again to leave' : 'Leave programme'}
                  variant="outline"
                  onPress={triggerLeave}
                />
              </Disclosure>
            </Card>
          </Section>

          {/* What has actually been done against the programme, as figures
              rather than as a list of dates nobody reads back. */}
          {history.length > 0 ? (
            <Section index={section++}>
              <Card>
                <CardHead
                  icon="checkmark-done-outline"
                  tint={iconInk.mint}
                  title="Since you started"
                  detail="Counted from logged workouts, so it answers whether the programme is actually being run."
                />
                <StatGrid>
                  <StatBlock label="Sessions" value={history.length} />
                  <StatBlock
                    label="Sets"
                    value={history.reduce((sum, s) => sum + s.sets, 0)}
                  />
                </StatGrid>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  Last session{' '}
                  {new Date(`${history[0].date}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
              </Card>
            </Section>
          ) : null}
        </>
      ) : null}

      {/* The catalogue. A wall of cards while enrolled, when the only
          question it answers is one somebody asks rarely. */}
      <Section index={section++}>
        {enrolled ? (
          <Disclosure
            label="Change programme"
            hint={`${programs.length} available`}
            icon="swap-horizontal-outline"
          >
            <ProgramList programs={programs} enrolledId={enrolled.id} busy={busy} onJoin={join} />
          </Disclosure>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              Choose a programme
            </Text>
            <ProgramList programs={programs} enrolledId={undefined} busy={busy} onJoin={join} />
          </View>
        )}
      </Section>

      {programs.length === 0 ? (
        <Card>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            No programmes available yet.
          </Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}

function ProgramList({
  programs,
  enrolledId,
  busy,
  onJoin,
}: {
  programs: ReturnType<typeof usePrograms>['programs'];
  enrolledId: string | undefined;
  busy: boolean;
  onJoin: (id: string) => void;
}) {
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ gap: spacing.md }}>
      {programs.map((program) => {
        const isCurrent = program.id === enrolledId;
        const movements = program.days.reduce((sum, day) => sum + day.exercises.length, 0);
        return (
          <Card key={program.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text
                style={[typography.subheading, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}
              >
                {program.name}
              </Text>
              {isCurrent ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.success} />
              ) : null}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {program.description}
            </Text>
            {/* The shape of the programme in one line, rather than a chip
                per day. What someone comparing two of these wants is how
                many sessions and how much is in them. */}
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {program.days.length} session{program.days.length === 1 ? '' : 's'} ·{' '}
              {movements} movements · {program.days.map((d) => d.name).join(' / ')}
            </Text>
            {!isCurrent ? (
              <GradientButton
                label={enrolledId ? 'Switch to this' : 'Start this programme'}
                variant="outline"
                disabled={busy}
                onPress={() => onJoin(program.id)}
              />
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
