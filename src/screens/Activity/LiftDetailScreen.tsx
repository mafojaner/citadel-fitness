import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Text, View } from 'react-native';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { ScreenContainer } from '../../components/ScreenContainer';
import { Sparkline } from '../../components/Sparkline';
import { StatChip } from '../../components/StatChip';
import { useLiftDetail } from '../../hooks/useLiftDetail';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

function formatDate(dateString: string | null) {
  if (!dateString) return null;
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * One lift, with everything the tier knows about it.
 *
 * Goal forecasting, the records vault and the strength progression list were
 * three descriptions of the same exercise, built on the same logged sets,
 * with no route between them -- a goal on Bench Press could not reach the
 * Bench Press record, and neither could reach its progression. This is where
 * those three meet, and all three screens now open it.
 */
export function LiftDetailScreen() {
  const { colors, spacing, typography } = useTheme();
  const route = useRoute<RouteProp<ActivityStackParamList, 'LiftDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const { data, loading, error, reload } = useLiftDetail(route.params.exerciseId);

  if (loading && !data) {
    return (
      <ScreenContainer>
        <ActivityIndicator color={colors.primary} />
      </ScreenContainer>
    );
  }

  if (error || !data) {
    return (
      <ScreenContainer>
        <ErrorNotice message={error ?? 'Could not load this lift.'} onRetry={reload} />
      </ScreenContainer>
    );
  }

  const { record, goal, series } = data;
  const values = series.map((point) => point.value);
  const first = values[0];
  const latest = values[values.length - 1];
  const changePct =
    values.length > 1 && first > 0 ? Math.round(((latest - first) / first) * 100) : null;
  const up = changePct !== null && changePct > 0;
  const flat = changePct === 0;
  const trendTint = flat
    ? colors.textMuted
    : up
      ? colors.success
      : changePct === null
        ? colors.textMuted
        : colors.danger;

  return (
    <ScreenContainer>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          <StatChip
            icon="layers-outline"
            value={`${record.totalSets} set${record.totalSets === 1 ? '' : 's'}`}
          />
          {record.lastPerformed ? (
            <StatChip icon="time-outline" value={`Last ${formatDate(record.lastPerformed)}`} />
          ) : null}
        </View>
      </Card>

      {/* The record half. */}
      <Card title="Your bests">
        {record.heaviestWeight ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>
                {record.heaviestWeight} {weightUnit}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                × {record.heaviestReps} · {formatDate(record.heaviestDate)}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>Heaviest set</Text>
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Nothing with a weight on it yet.
          </Text>
        )}

        {record.bestEstimate ? (
          <View style={{ gap: spacing.xs, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {record.bestEstimate} {weightUnit}
              </Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {formatDate(record.bestEstimateDate)}
              </Text>
            </View>
            {/* Named as an estimate every time it appears. It is arithmetic
                on a set that was actually done, not a lift anyone has made. */}
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Best estimated one-rep max
            </Text>
          </View>
        ) : null}
      </Card>

      {/* The progression half. */}
      <Card title="Progression">
        {values.length < 2 ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Log this lift on a second day and its trend appears here. One session is a
            point, not a direction.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Sparkline
                values={values}
                color={trendTint}
                width={110}
                height={38}
                accessibilityLabel={`Estimated one-rep max across ${values.length} sessions`}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                  <Ionicons
                    name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'}
                    size={15}
                    color={trendTint}
                  />
                  <Text style={{ color: trendTint, fontWeight: '700' }}>
                    {Math.abs(changePct ?? 0)}%
                  </Text>
                </View>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                  {first} → {latest} {weightUnit} over {values.length} sessions
                </Text>
              </View>
            </View>
          </>
        )}
      </Card>

      {/* The goal half. */}
      <Card title="Goal">
        {goal ? (
          <View style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
              <Text style={[typography.title, { color: colors.textPrimary }]}>
                {goal.target} {goal.unit}
              </Text>
              <Text style={[typography.body, { color: colors.textSecondary }]}>
                by {formatDate(goal.targetDate)}
              </Text>
            </View>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {goal.daysLeft >= 0
                ? `${goal.daysLeft} day${goal.daysLeft === 1 ? '' : 's'} left`
                : 'Target date has passed'}
            </Text>
            <GradientButton
              label="Open goal forecast"
              variant="outline"
              onPress={() => navigation.navigate('GoalForecast')}
            />
          </View>
        ) : (
          <>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              No target on this lift yet.
            </Text>
            <GradientButton
              label="Set a target"
              variant="outline"
              onPress={() => navigation.navigate('GoalForecast')}
            />
          </>
        )}
      </Card>
    </ScreenContainer>
  );
}
