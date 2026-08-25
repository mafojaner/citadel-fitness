import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { useLiftGoals } from '../../hooks/useLiftGoals';
import { todayISO } from '../../lib/analytics';
import type { GoalProjection, GoalStatus } from '../../lib/goals';
import { useProfileStore } from '../../state/profileStore';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

const STATUS_COPY: Record<GoalStatus, { label: string; detail: string; icon: keyof typeof Ionicons.glyphMap }> = {
  achieved: { label: 'Achieved', detail: 'You have already lifted this.', icon: 'checkmark-circle' },
  'on-track': { label: 'On track', detail: 'Your current rate gets you there in time.', icon: 'trending-up' },
  behind: { label: 'Behind', detail: 'Rising, but not fast enough for this date.', icon: 'alert-circle' },
  declining: { label: 'Not rising', detail: 'This lift is flat or falling right now.', icon: 'trending-down' },
  'no-trend': { label: 'Not enough data', detail: 'Log this lift on two separate days to see a projection.', icon: 'help-circle' },
};

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
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const { projections, liftedExercises, loading, saving, error, reload, addGoal, removeGoal } =
    useLiftGoals();

  const [picked, setPicked] = useState<string | null>(null);
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState('');

  const dateLooksValid = /^\d{4}-\d{2}-\d{2}$/.test(date) && date > todayISO();
  const parsedWeight = Number(weight);
  const weightValid = Number.isFinite(parsedWeight) && parsedWeight > 0;
  const canSave = Boolean(picked) && weightValid && dateLooksValid && !saving;

  const onSave = async () => {
    if (!picked || !canSave) return;
    await addGoal(picked, parsedWeight, weightUnit, date);
    setPicked(null);
    setWeight('');
    setDate('');
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

    return (
      <Card key={p.goal.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Ionicons name={copy.icon} size={20} color={tint} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
              {p.exerciseName}
            </Text>
            <Text style={{ color: tint, fontWeight: '700', fontSize: 12 }}>{copy.label}</Text>
          </View>
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

        <Text style={[typography.caption, { color: colors.textSecondary }]}>{copy.detail}</Text>

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

  return (
    <ScreenContainer>
      <Card title="Set a target">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Pick a lift, a weight, and a date. The projection comes from your own logged
          history, so there&apos;s nothing to keep updated by hand.
        </Text>

        {liftedExercises.length === 0 ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Log a strength exercise first. A projection is fitted to your own history, so
            there needs to be some.
          </Text>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {liftedExercises.map((lift) => (
              <GradientPill
                key={lift.id}
                label={lift.name}
                active={picked === lift.id}
                onPress={() => setPicked(lift.id)}
              />
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder={`Target (${weightUnit})`}
            placeholderTextColor={colors.textMuted}
            accessibilityLabel={`Target weight in ${weightUnit}`}
            style={{
              flex: 1,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.textPrimary,
            }}
          />
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textMuted}
            accessibilityLabel="Target date, year dash month dash day"
            style={{
              flex: 1,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.md,
              padding: spacing.md,
              color: colors.textPrimary,
            }}
          />
        </View>

        {date.length > 0 && !dateLooksValid ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Use YYYY-MM-DD, and pick a date in the future.
          </Text>
        ) : null}

        <GradientButton
          label={saving ? 'Saving...' : 'Save goal'}
          loading={saving}
          disabled={!canSave}
          onPress={onSave}
        />
      </Card>

      {error ? <ErrorNotice message={error} onRetry={reload} /> : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : projections.length === 0 ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <GradientIconBadge icon="flag" colors={gradients.reward} size={44} />
            <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
              <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
                No goals yet
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                Set one above and it starts tracking against everything you log.
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        projections.map(renderProjection)
      )}
    </ScreenContainer>
  );
}
