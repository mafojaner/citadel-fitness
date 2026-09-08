import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CardHead } from '../../components/CardHead';
import { Disclosure } from '../../components/Disclosure';
import { EmptyState } from '../../components/EmptyState';
import { ExercisePickerSheet } from '../../components/ExercisePickerSheet';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientPill } from '../../components/GradientPill';
import { IconWell } from '../../components/IconWell';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TierMark } from '../../components/TierMark';
import { ForecastBar } from '../../components/analytics/ForecastBar';
import { Section } from '../../components/analytics/Section';
import { StatBlock } from '../../components/analytics/StatBlock';
import { StatGrid } from '../../components/analytics/StatGrid';
import {
  CATEGORY_ICONS,
  CATEGORY_INK,
  DEFAULT_CATEGORY_ICON,
  DEFAULT_CATEGORY_INK,
} from '../../constants/categories';
import { useExercises } from '../../hooks/useExercises';
import { useLiftGoals, type LiftedExercise } from '../../hooks/useLiftGoals';
import { todayISO } from '../../lib/analytics';
import {
  goalProgress,
  isoInWeeks,
  splitGoals,
  suggestedTargets,
  summariseGoals,
  type GoalProjection,
  type GoalStatus,
} from '../../lib/goals';
import { useProfileStore } from '../../state/profileStore';
import type { Exercise } from '../../types/models';
import { useTheme } from '../../theme/useTheme';
import { iconInk } from '../../theme/tokens';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

/**
 * What each status is called, what it means, and the ink that carries it.
 *
 * The ink lives on the status disc and the progress fill, not on the label
 * text -- an amber word at 12px on a white card is around 2:1, and the
 * screen was setting three of its five statuses that way. The app's rule is
 * that colour belongs on a glyph disc, where it sits behind a white icon
 * and has nothing to be legible against.
 *
 * `behind` was drawn in `colors.primary`, the brand orange, which in this
 * app means "paid" -- it is the ink on every tier mark, feature disc and
 * lock. A goal running late is not an upsell.
 */
const STATUS: Record<
  GoalStatus,
  {
    label: string;
    detail: string;
    icon: keyof typeof Ionicons.glyphMap;
    /** Undefined leaves the disc neutral, for the status with no finding yet. */
    tint?: string;
  }
> = {
  achieved: {
    label: 'Achieved',
    detail: 'You have already lifted this.',
    icon: 'checkmark-circle',
    tint: iconInk.mint,
  },
  'on-track': {
    label: 'On track',
    detail: 'Your current rate gets you there in time.',
    icon: 'trending-up',
    tint: iconInk.mint,
  },
  behind: {
    label: 'Behind',
    detail: 'Rising, but not fast enough for this date.',
    icon: 'alert-circle',
    tint: iconInk.amber,
  },
  declining: {
    label: 'Not rising',
    detail: 'This lift is flat or falling right now.',
    icon: 'trending-down',
    tint: iconInk.crimson,
  },
  'no-trend': {
    label: 'Not enough data',
    detail: 'Log this lift on two separate days to see a projection.',
    icon: 'help-circle',
  },
};

/**
 * The horizons offered, in the language training blocks are planned in.
 * See isoInWeeks in lib/goals for why this replaced a typed date field.
 * The resolved date is still shown once chosen, because that is what gets
 * stored and counted down against.
 */
const HORIZONS: { label: string; weeks: number }[] = [
  { label: '6 weeks', weeks: 6 },
  { label: '3 months', weeks: 13 },
  { label: '6 months', weeks: 26 },
  { label: 'A year', weeks: 52 },
];

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** One figure under a goal's bar: a number, and what it is. */
function GoalFact({ value, label }: { value: string; label: string }) {
  const { colors, typography } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: 76, gap: 1 }}>
      <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 14 }} numberOfLines={1}>
        {value}
      </Text>
      <Text
        style={[
          typography.caption,
          { color: colors.textMuted, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6 },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

/**
 * A goal is stored; the projection never is. Recomputing from logged history
 * on every view means a corrected workout corrects the forecast too, and a
 * goal can't drift out of step with the training behind it.
 *
 * Laid out in the same language as the records and analytics screens --
 * counted headline figures, a card head per section, an animated bar,
 * staggered arrival, the form behind a disclosure. What it was: a page whose
 * largest element was the machinery for making another goal, whose status
 * was a coloured word at 12px, and which reported the forecast it is named
 * after in a sentence while drawing only where you already are.
 */
export function GoalForecastScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const { projections, liftedExercises, loading, saving, error, reload, addGoal, removeGoal } =
    useLiftGoals();
  const { exercises } = useExercises();

  const [picked, setPicked] = useState<Exercise | null>(null);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  const [picking, setPicking] = useState(false);

  /**
   * Everything in the catalogue that can carry a weight.
   *
   * The form used to offer only lifts already logged, on the reasoning that
   * a projection is fitted to history so there needs to be some. True of the
   * forecast, and the wrong rule for the goal: someone who has decided to
   * start deadlifting cannot set a deadlift target until after they have
   * deadlifted twice, which is exactly backwards for a feature about intent.
   *
   * A goal on an unlogged lift is already handled -- `fetchGoalProjections`
   * maps over the goals rather than the response, so one with nothing behind
   * it comes back as "not enough data" rather than vanishing. The sheet says
   * so on the row before it is picked.
   */
  const catalogue = useMemo(
    () => exercises.filter((e) => e.type === 'strength'),
    [exercises]
  );

  /** What the app already knows about each lift, by id. */
  const historyById = useMemo(
    () => new Map(liftedExercises.map((l) => [l.id, l])),
    [liftedExercises]
  );
  const pickedLift = useMemo<LiftedExercise | null>(
    () => (picked ? historyById.get(picked.id) ?? null : null),
    [historyById, picked]
  );

  // A lift already carrying a goal is not offered again. Two goals on one
  // lift produce two projections from one trend line, which is noise rather
  // than information, and the second is usually a mistyped first.
  const goalledIds = useMemo(
    () => projections.map((p) => p.goal.exerciseId),
    [projections]
  );

  /**
   * The row's second line: what picking this one will get you.
   *
   * A lift with a usable estimate says what the goal will be measured
   * against, which is the number the suggestions step up from. One with no
   * history says the forecast will be empty until it has some -- better read
   * before the pick than discovered on the card afterwards.
   */
  const detailFor = (exercise: Exercise) => {
    const known = historyById.get(exercise.id);
    if (!known) return 'Not logged yet — no forecast until you do';
    if (known.best <= 0) return 'Logged, but no set low enough in reps to estimate a max';
    return `Best est. 1RM ${known.best} ${weightUnit}`;
  };

  const summary = useMemo(() => summariseGoals(projections), [projections]);
  const { active, achieved } = useMemo(() => splitGoals(projections), [projections]);

  const dateLooksValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date > todayISO();
  const parsedWeight = Number(weight);
  const weightValid = Number.isFinite(parsedWeight) && parsedWeight > 0;
  const canSave = picked !== null && weightValid && dateLooksValid && !saving;

  const resetForm = () => {
    setPicked(null);
    setWeight('');
    setDate('');
  };

  const onSave = async () => {
    if (!picked || !canSave) return;
    await addGoal(picked.id, parsedWeight, weightUnit, date);
    resetForm();
  };

  const renderProjection = (p: GoalProjection, index: number) => {
    const status = STATUS[p.status];
    const { share, projectedShare } = goalProgress(p);
    const fill = status.tint ?? colors.border;
    // How much is left, in the unit the goal is set in. "8 kg to go" is the
    // question someone actually has; a bar alone answers it approximately.
    const remaining = Math.max(0, Math.round((p.target - p.current) * 10) / 10);

    return (
      <Card key={p.goal.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconWell icon={status.icon} size={36} tint={status.tint} />
          {/* The name opens the lift's own screen, where this goal sits
              beside the record and the progression it is measured against.
              Not the whole card: the row also carries a delete control, and
              a card that both navigates and deletes is a card that deletes
              by accident. */}
          <AnimatedPressable
            onPress={() =>
              navigation.navigate('LiftDetail', {
                exerciseId: p.goal.exerciseId,
                exerciseName: p.exerciseName,
              })
            }
            scaleTo={0.99}
            accessibilityRole="button"
            accessibilityLabel={`${p.exerciseName}, ${status.label}. Opens this lift's record, goal and progression.`}
            style={{ flex: 1, minWidth: 0 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {p.exerciseName}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary, fontWeight: '700' }]}>
              {status.label}
            </Text>
          </AnimatedPressable>
          <Pressable
            onPress={() => removeGoal(p.goal.id)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remove goal for ${p.exerciseName}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View
          style={{
            gap: spacing.sm,
            paddingTop: spacing.sm,
            borderTopWidth: 1,
            borderTopColor: colors.border,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
            <Text
              style={{
                color: colors.textPrimary,
                fontSize: 26,
                fontWeight: '800',
                letterSpacing: -0.4,
              }}
            >
              {p.current}
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary, flex: 1, minWidth: 0 }]}>
              of {p.target} {p.goal.targetUnit} · by {formatDate(p.goal.targetDate)}
            </Text>
          </View>

          {/* Where you are, and where the trend puts you on the day it is
              due. The mark clearing the end of the track is the whole
              answer to "will I make it". */}
          <ForecastBar
            share={share}
            projectedShare={projectedShare}
            color={fill}
            delayMs={Math.min(index * 60, 240)}
          />

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm }}>
            <GoalFact
              value={remaining > 0 ? `${remaining} ${p.goal.targetUnit}` : 'Reached'}
              label="To go"
            />
            {p.status !== 'no-trend' && p.status !== 'achieved' ? (
              <GoalFact
                value={`${p.weeklyRate > 0 ? '+' : ''}${p.weeklyRate} ${p.goal.targetUnit}`}
                label="Per week"
              />
            ) : null}
            {/* Dropped once the target is hit: "91 days left" on a goal
                you have already met reads as work still outstanding. */}
            {p.status !== 'achieved' ? (
              <GoalFact
                value={
                  p.daysRemaining >= 0
                    ? `${p.daysRemaining} day${p.daysRemaining === 1 ? '' : 's'}`
                    : 'Passed'
                }
                label={p.daysRemaining >= 0 ? 'Left' : 'Deadline'}
              />
            ) : null}
            <GoalFact
              value={`${p.sessions}`}
              label={`Session${p.sessions === 1 ? '' : 's'}`}
            />
          </View>

          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {status.detail}
            {/* The forecast said out loud as well as drawn. The mark on the
                track shows whether it clears the target; the number is what
                someone repeats to themselves in the gym. */}
            {p.projected !== null && p.status !== 'achieved'
              ? ` On this trend you are at ${p.projected} ${p.goal.targetUnit} by then${
                  p.projectedDate ? `, reaching ${p.target} around ${formatDate(p.projectedDate)}` : ''
                }.`
              : ''}
          </Text>
        </View>
      </Card>
    );
  };

  const form = (
    <>
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Pick a lift, a weight, and how far out. The projection comes from your own
        logged history, so there&apos;s nothing to keep updated by hand.
      </Text>

      {/* One control that opens the whole catalogue, where this was a
          wrapping row of one pill per logged lift. That row was fine at
          eight lifts, unreadable at eighty, and could only ever offer
          things already trained -- so the answer to "I want to start
          squatting to 100 kg" was that you cannot say so yet. */}
      <AnimatedPressable
        onPress={() => setPicking(true)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityLabel={picked ? `Lift: ${picked.name}. Change it.` : 'Choose a lift'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
        }}
      >
        <IconWell
          icon={picked ? CATEGORY_ICONS[picked.category] ?? DEFAULT_CATEGORY_ICON : 'search'}
          size={32}
          tint={picked ? CATEGORY_INK[picked.category] ?? DEFAULT_CATEGORY_INK : undefined}
        />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}
            numberOfLines={1}
          >
            {picked ? picked.name : 'Choose a lift'}
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
            {picked ? 'Tap to change' : `Search all ${catalogue.length} lifts`}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </AnimatedPressable>

      {picked && !pickedLift ? (
        // Picked something never logged. Said here as well as in the sheet,
        // because this is the last screen before it is saved.
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          You haven&apos;t logged {picked.name} yet. The goal saves fine; the forecast
          fills in once it has been logged on two separate days.
        </Text>
      ) : null}

      {pickedLift ? (
        <View style={{ gap: spacing.xs }}>
          {/* Named as an estimate, and shown with the set it came from.
              *
              * This line read "Best so far: 70 kg" -- the heaviest set --
              * while the forecast scored the goal against an estimated max
              * of 82.3, so the targets it suggested were already met before
              * they were saved. It now states the number the goal is
              * actually judged on, and says where that number comes from,
              * because 82.3 kg is a weight this member has never had on a
              * bar. */}
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {pickedLift.best > 0 ? (
              <>
                Best est. 1RM: <Text style={{ fontWeight: '700' }}>{pickedLift.best} {weightUnit}</Text>
                {pickedLift.heaviestWeight > 0
                  ? ` from ${pickedLift.heaviestWeight} ${weightUnit} × ${pickedLift.heaviestReps}`
                  : ''}
              </>
            ) : (
              'No set on this lift is low enough in reps to estimate a max from.'
            )}
            {pickedLift.lastLogged ? ` · last trained ${formatDate(pickedLift.lastLogged)}` : ''}
          </Text>
          {suggestedTargets(pickedLift.best).length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {suggestedTargets(pickedLift.best).map((value) => (
                <GradientPill
                  key={value}
                  label={`${value} ${weightUnit}`}
                  active={weight === String(value)}
                  onPress={() => setWeight(String(value))}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      <TextInput
        value={weight}
        onChangeText={setWeight}
        keyboardType="numeric"
        placeholder={`Target (${weightUnit})`}
        placeholderTextColor={colors.textMuted}
        accessibilityLabel={`Target weight in ${weightUnit}`}
        style={{
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />

      <View style={{ gap: spacing.xs }}>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>By when?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {HORIZONS.map((horizon) => {
            const iso = isoInWeeks(horizon.weeks);
            return (
              <GradientPill
                key={horizon.label}
                label={horizon.label}
                active={date === iso}
                onPress={() => setDate(iso)}
              />
            );
          })}
        </View>
        {dateLooksValid ? (
          // The chosen horizon resolved to a real date. Shown because that
          // is what gets stored, counted down against, and displayed on the
          // goal card afterwards -- "3 months" should not be the last time
          // you see what it actually means.
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Target date: {formatDate(date)}
          </Text>
        ) : null}
      </View>

      <GradientButton
        label={saving ? 'Saving...' : 'Save goal'}
        loading={saving}
        disabled={!canSave}
        onPress={onSave}
      />

      <ExercisePickerSheet
        visible={picking}
        title="Choose a lift"
        searchPlaceholder="Search lifts"
        options={catalogue}
        chosenIds={goalledIds}
        chosenLabel="already has a goal"
        detailFor={detailFor}
        onPick={(exercise) => {
          setPicked(exercise);
          // Clearing the weight matters: the suggestions below are relative
          // to the lift, so a number left over from the previous pick is a
          // target measured against nothing.
          setWeight('');
        }}
        onClose={() => setPicking(false)}
      />
    </>
  );

  let section = 0;

  return (
    <ScreenContainer>
      <TierMark />
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : projections.length === 0 ? (
        // Nothing to look at yet, so the page explains itself first and the
        // form is open under it. This was the other way round: the form sat
        // above the empty state that says what the form is for.
        <>
          <EmptyState
            tint={iconInk.amber}
            icon="flag"
            title="No goals yet"
            detail="Set one below and it starts tracking against everything you log — no updating by hand."
          />
          <Disclosure
            label="Set a target"
            hint="Pick a lift, a weight and a horizon"
            icon="flag-outline"
            tint={iconInk.amber}
            defaultOpen
          >
            {form}
          </Disclosure>
        </>
      ) : (
        <>
          {/* Where the goals stand, before any one of them. Someone who
              opens this to check on a Tuesday morning wants the count of
              what is slipping, not to read five cards to work it out. */}
          <Section index={section++}>
            <Card>
              <StatGrid>
                <StatBlock label="Chasing" value={summary.active} detail="goals" />
                <StatBlock label="On track" value={summary.onTrack} detail="of those" />
                <StatBlock label="Achieved" value={summary.achieved} detail="hit" />
                {/* Three different sentences rather than one number, because
                    "due today", "a week overdue" and "nothing pending" are
                    three different things and a bare 0 says all of them. */}
                <StatBlock
                  label="Next up"
                  value={Math.abs(summary.nextDeadlineDays ?? 0)}
                  detail={
                    summary.nextDeadlineDays === null
                      ? 'none pending'
                      : summary.nextDeadlineDays < 0
                        ? 'days overdue'
                        : 'days away'
                  }
                />
              </StatGrid>
            </Card>
          </Section>

          {active.map((p, i) => (
            <Section key={p.goal.id} index={section + i}>
              {renderProjection(p, i)}
            </Section>
          ))}

          {achieved.length > 0 ? (
            <>
              {/* A card head, where this was a bare line of text -- the one
                  heading on the page that was not built like the rest. */}
              <Card>
                <CardHead
                  icon="trophy"
                  tint={iconInk.gold}
                  title={`${achieved.length} achieved`}
                  detail="Kept rather than deleted: this is the only record that the target was ever met."
                />
              </Card>
              {achieved.map((p, i) => renderProjection(p, active.length + i))}
            </>
          ) : null}

          {/* The form is a tool, not the subject, so it sits at the foot
              behind a disclosure -- the same treatment the programme page
              gives its tools and the records page gives export. It used to
              be a full card permanently at the top, which meant every visit
              after the first opened on the machinery for making another
              goal rather than on the goals. */}
          <Disclosure
            label="Set another target"
            hint="Any lift in the catalogue, on any horizon"
            icon="flag-outline"
            tint={iconInk.amber}
          >
            {form}
          </Disclosure>
        </>
      )}
    </ScreenContainer>
  );
}
