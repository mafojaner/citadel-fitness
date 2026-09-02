import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TierMark } from '../../components/TierMark';
import { useLiftGoals, type LiftedExercise } from '../../hooks/useLiftGoals';
import { todayISO } from '../../lib/analytics';
import { isoInWeeks, suggestedTargets, type GoalProjection, type GoalStatus } from '../../lib/goals';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

const STATUS_COPY: Record<GoalStatus, { label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }> = {
  achieved: { label: 'Achieved', detail: 'You have already lifted this.', icon: 'checkmark-circle' },
  'on-track': { label: 'On track', detail: 'Your current rate gets you there in time.', icon: 'trending-up' },
  behind: { label: 'Behind', detail: 'Rising, but not fast enough for this date.', icon: 'alert-circle' },
  declining: { label: 'Not rising', detail: 'This lift is flat or falling right now.', icon: 'trending-down' },
  'no-trend': { label: 'Not enough data', detail: 'Log this lift on two separate days to see a projection.', icon: 'help-circle' },
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

/**
 * A goal is stored; the projection never is. Recomputing from logged history
 * on every view means a corrected workout corrects the forecast too, and a
 * goal can't drift out of step with the training behind it.
 */
export function GoalForecastScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const { projections, liftedExercises, loading, saving, error, reload, addGoal, removeGoal } =
    useLiftGoals();

  const [picked, setPicked] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');
  // Closed by default once there are goals to look at. The form used to sit
  // permanently at the top of the screen, so on every visit after the first
  // the least useful thing on the page was also the largest -- you came back
  // to check a forecast and had to scroll past the machinery for creating
  // another one.
  const [composing, setComposing] = useState(false);

  const pickedLift = useMemo<LiftedExercise | null>(
    () => liftedExercises.find((l) => l.id === picked) ?? null,
    [liftedExercises, picked]
  );

  // A lift already carrying a goal is not offered again. Two goals on one
  // lift produce two projections from one trend line, which is noise rather
  // than information, and the second is usually a mistyped first.
  const goalledIds = useMemo(
    () => new Set(projections.map((p) => p.goal.exerciseId)),
    [projections]
  );
  const available = useMemo(
    () => liftedExercises.filter((l) => !goalledIds.has(l.id)),
    [liftedExercises, goalledIds]
  );

  // Achieved goals are kept but moved out of the way. Deleting them on
  // completion would throw away the only record that the target was ever
  // met; leaving them in the main list means a year of hit goals slowly
  // buries the two you are actually chasing.
  const active = projections.filter((p) => p.status !== 'achieved');
  const achieved = projections.filter((p) => p.status === 'achieved');

  const dateLooksValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date > todayISO();
  const parsedWeight = Number(weight);
  const weightValid = Number.isFinite(parsedWeight) && parsedWeight > 0;
  const canSave = Boolean(picked) && weightValid && dateLooksValid && !saving;

  const resetForm = () => {
    setPicked(null);
    setWeight('');
    setDate('');
  };

  const onSave = async () => {
    if (!picked || !canSave) return;
    await addGoal(picked, parsedWeight, weightUnit, date);
    resetForm();
    setComposing(false);
  };

  const renderProjection = (p: GoalProjection) => {
    const copy = STATUS_COPY[p.status];
    const tint =
      p.status === 'achieved' || p.status === 'on-track'
        ? colors.success
        : p.status === 'behind'
          ? colors.primary
          : p.status === 'declining'
            ? colors.danger
            : colors.textMuted;
    const arrival = formatDate(p.projectedDate);
    // How much is left, in the unit the goal is set in. "18 kg to go" is the
    // question someone actually has ("how far am I?"); a percentage bar
    // alone answers it only approximately.
    const remaining = Math.max(0, Math.round((p.target - p.current) * 10) / 10);

    return (
      <Card key={p.goal.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={copy.icon} size={20} color={tint} />
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
            accessibilityLabel={`${p.exerciseName}. Opens this lift's record, goal and progression.`}
            style={{ flex: 1, minWidth: 0 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {p.exerciseName}
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
            </View>
            <Text style={{ color: tint, fontWeight: '700', fontSize: 12 }}>{copy.label}</Text>
          </AnimatedPressable>
          <Pressable
            onPress={() => removeGoal(p.goal.id)}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={`Remove goal for ${p.exerciseName}`}
          >
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>
            {p.current}
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            of {p.target} {p.goal.targetUnit} · by {formatDate(p.goal.targetDate)}
          </Text>
        </View>

        <View
          style={{
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: colors.background,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.min(100, Math.max((p.current / p.target) * 100, 1))}%`,
              height: '100%',
              borderRadius: radius.pill,
              backgroundColor: tint,
            }}
          />
        </View>

        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {remaining > 0 ? `${remaining} ${p.goal.targetUnit} to go · ` : ''}
          {copy.detail}
        </Text>

        {p.status !== 'no-trend' && p.status !== 'achieved' ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {p.weeklyRate > 0 ? '+' : ''}
            {p.weeklyRate} {p.goal.targetUnit}/week over {p.sessions} sessions
            {arrival ? ` · on this trend you reach it around ${arrival}` : ''}
            {p.daysRemaining >= 0 ? ` · ${p.daysRemaining} days left` : ' · date has passed'}
          </Text>
        ) : null}
      </Card>
    );
  };

  const suggestions = pickedLift ? suggestedTargets(pickedLift.best) : [];

  const form = (
    <Card title="Set a target">
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Pick a lift, a weight, and how far out. The projection comes from your own
        logged history, so there&apos;s nothing to keep updated by hand.
      </Text>

      {liftedExercises.length === 0 ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Log a strength exercise first. A projection is fitted to your own history, so
          there needs to be some.
        </Text>
      ) : available.length === 0 ? (
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Every lift you have logged already has a goal. Remove one, or log a new lift,
          to set another.
        </Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {available.map((lift) => (
            <GradientPill
              key={lift.id}
              label={lift.name}
              active={picked === lift.id}
              onPress={() => {
                setPicked(lift.id);
                // Clearing the weight matters: the suggestions below are
                // relative to the lift, so a number left over from the
                // previous pick is a target measured against nothing.
                setWeight('');
              }}
            />
          ))}
        </View>
      )}

      {pickedLift ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Best so far: <Text style={{ fontWeight: '700' }}>{pickedLift.best} {weightUnit}</Text>
            {pickedLift.lastLogged ? ` · last trained ${formatDate(pickedLift.lastLogged)}` : ''}
          </Text>
          {suggestions.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {suggestions.map((value) => (
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

      {projections.length > 0 ? (
        <GradientButton
          label="Cancel"
          variant="outline"
          onPress={() => {
            resetForm();
            setComposing(false);
          }}
        />
      ) : null}
    </Card>
  );

  return (
    <ScreenContainer>
      <TierMark />
      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : projections.length === 0 ? (
        // Nothing to look at yet, so the form is the screen and there is
        // nothing to collapse it in favour of.
        <>
          {form}
          <EmptyState
            icon="flag"
            colors={gradients.reward}
            title="No goals yet"
            detail="Set one above and it starts tracking against everything you log."
          />
        </>
      ) : (
        <>
          {composing ? (
            form
          ) : (
            <GradientButton
              label="Set another target"
              variant="outline"
              onPress={() => setComposing(true)}
            />
          )}

          {active.map(renderProjection)}

          {achieved.length > 0 ? (
            <>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                Achieved
              </Text>
              {achieved.map(renderProjection)}
            </>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}
