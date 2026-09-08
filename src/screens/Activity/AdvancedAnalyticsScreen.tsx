import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CardHead } from '../../components/CardHead';
import { EmptyState } from '../../components/EmptyState';
import { ErrorNotice } from '../../components/ErrorNotice';
import { FadeInView } from '../../components/FadeInView';
import { IconWell } from '../../components/IconWell';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { TierMark } from '../../components/TierMark';
import { Sparkline } from '../../components/Sparkline';
import { GrowBar } from '../../components/analytics/GrowBar';
import { SegmentedShareBar } from '../../components/analytics/SegmentedShareBar';
import { StatBlock } from '../../components/analytics/StatBlock';
import { StatGrid } from '../../components/analytics/StatGrid';
import { TrendChart } from '../../components/analytics/TrendChart';
import { WeekdayHistogram } from '../../components/analytics/WeekdayHistogram';
import {
  CATEGORY_INK,
  DEFAULT_CATEGORY_INK,
  CATEGORY_ICONS,
  DEFAULT_CATEGORY_ICON,
} from '../../constants/categories';
import { useAdvancedAnalytics } from '../../hooks/useAdvancedAnalytics';
import { useDeepAnalytics } from '../../hooks/useDeepAnalytics';
import { usePeriodComparison } from '../../hooks/usePeriodComparison';
import { shortDateLabel } from '../../lib/analytics';
import { changePct } from '../../lib/periodComparison';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import { iconInk } from '../../theme/tokens';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

const PERIODS: { label: string; days: number | null }[] = [
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'All time', days: null },
];

/**
 * Cards arrive in sequence rather than at once.
 *
 * A screen this dense appearing in a single frame is a wall; 70ms apart it
 * reads top to bottom, which is the order the sections are meant to be read
 * in anyway. Capped so the last card on a long page is not still arriving
 * after half a second.
 */
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 420;

function Section({ index, children }: { index: number; children: ReactNode }) {
  return (
    <FadeInView slideDistance={12} duration={Math.min(index * STAGGER_MS, MAX_STAGGER_MS) + 260}>
      {children}
    </FadeInView>
  );
}

/**
 * The change against the previous window, in words.
 *
 * Reports "no earlier data to compare" rather than a percentage when the
 * previous window is empty: everything is up from nothing, and a confident
 * +100% against a fortnight nobody trained would be the most misleading
 * number on the screen.
 */
function ComparisonLine({
  comparison,
  label,
}: {
  comparison: { current: { sets: number }; previous: { sets: number } };
  label: string;
}) {
  const { colors, spacing, typography } = useTheme();
  const change = changePct(comparison.current.sets, comparison.previous.sets);

  if (change === null) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        No sets in the previous {label.toLowerCase()} to compare against.
      </Text>
    );
  }

  const up = change > 0;
  const flat = change === 0;
  const tint = flat ? colors.textMuted : up ? colors.success : colors.danger;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      <Ionicons name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'} size={14} color={tint} />
      <Text style={[typography.caption, { color: tint, fontWeight: '700' }]}>{Math.abs(change)}%</Text>
      <Text style={[typography.caption, { color: colors.textMuted, flex: 1, minWidth: 0 }]}>
        {flat ? 'same as' : up ? 'more sets than' : 'fewer sets than'} the previous{' '}
        {label.toLowerCase()} ({comparison.previous.sets})
      </Text>
    </View>
  );
}

/**
 * The questions the free Activity screen cannot answer, on one page: where
 * the work is going, whether the lifts are moving, how hard it is being
 * done, and whether any of it is happening consistently.
 *
 * Two fetches rather than one. `useAdvancedAnalytics` returns the nested
 * shapes -- muscle balance, per-lift progression points -- and
 * `useDeepAnalytics` returns flat per-day rollups that everything else is
 * derived from. They are separate RPCs on purpose: see the note in
 * analyticsDeep.ts and the one get_period_comparison left behind.
 */
export function AdvancedAnalyticsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const weightUnit = useProfileStore((s) => s.preferences.units);
  const distanceUnit = useProfileStore((s) => s.preferences.distanceUnit);
  const [periodIndex, setPeriodIndex] = useState(0);
  const period = PERIODS[periodIndex];

  const { balance, progressions, totalSets, activeDays, loading, error, reload } =
    useAdvancedAnalytics(period.days);
  const deep = useDeepAnalytics(period.days);
  const comparison = usePeriodComparison(period.days);

  const empty = !loading && !error && balance.length === 0;
  const { consistency, intensity, repBands, weeks, topLifts, cardio, totalVolume } = deep;
  /**
   * The rollup call can fail on its own -- it is a separate RPC, and until
   * its migration is applied it does not exist at all. Everything derived
   * from it is then zero, and a zero on this page is a claim: "no volume",
   * "never trains on a Tuesday". So the sections it feeds are drawn only
   * when it actually answered, and the failure gets said out loud instead.
   */
  const deepReady = !deep.loading && !deep.error;

  const volumePoints = weeks.map((w) => ({
    value: w.volume,
    // Day and month only: a week label carrying the year is three characters
    // of noise repeated across every tick.
    label: w.weekStart.slice(8, 10) + '/' + w.weekStart.slice(5, 7),
  }));
  const rpeWeeks = weeks.filter((w) => w.avgRpe !== null);
  const rpePoints = rpeWeeks.map((w) => ({
    value: w.avgRpe as number,
    label: w.weekStart.slice(8, 10) + '/' + w.weekStart.slice(5, 7),
  }));

  const bandColors: Record<string, string> = {
    low: iconInk.ember,
    mid: iconInk.violet,
    high: iconInk.cyan,
  };

  let section = 0;

  return (
    <ScreenContainer>
      <TierMark />
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        {PERIODS.map((p, i) => (
          <GradientPill
            key={p.label}
            label={p.label}
            active={i === periodIndex}
            onPress={() => setPeriodIndex(i)}
            flex
          />
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : error ? (
        <ErrorNotice message={error} onRetry={reload} />
      ) : empty ? (
        <EmptyState
          tint={iconInk.cyan}
          icon="trending-up"
          title="Nothing logged in this period"
          detail="Try a longer range, or log a workout and come back."
        />
      ) : (
        <>
          {/* The headline four, before any chart. Someone who opens this
              screen and leaves within a second should still have learned
              something, and these are the four figures worth that second. */}
          <Section index={section++}>
            <Card>
              <StatGrid>
                <StatBlock label="Sets" value={totalSets} />
                <StatBlock label="Active days" value={activeDays} />
                {/* Only once the rollups are actually in. A zero here is
                    indistinguishable from a window with no volume, so a
                    failed fetch would read as a truthful finding. Dropping
                    them leaves two cells, which is still a whole row. */}
                {deepReady ? (
                  <StatBlock
                    label="Volume"
                    value={totalVolume}
                    unit={weightUnit}
                    detail={totalVolume > 0 ? 'reps × weight' : undefined}
                  />
                ) : null}
                {deepReady ? (
                  <StatBlock
                    label="Per week"
                    value={consistency.sessionsPerWeek}
                    precision={1}
                    detail="sessions"
                  />
                ) : null}
              </StatGrid>
              {comparison ? (
                <View style={{ paddingTop: spacing.sm }}>
                  <ComparisonLine comparison={comparison} label={period.label} />
                </View>
              ) : null}
            </Card>
          </Section>

          {deep.error ? (
            <Section index={section++}>
              <ErrorNotice message={deep.error} onRetry={deep.reload} />
            </Section>
          ) : null}

          {deepReady ? (
            <>
          {/* Training load over time. The stat block above says how much;
              this says whether it is going anywhere. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="trending-up"
                tint={iconInk.ember}
                title="Training load"
                detail="Volume per week. A flat line at a high number is maintenance; a climb is progression."
              />
              <TrendChart
                points={volumePoints}
                color={colors.textPrimary}
                caption={`VOLUME PER WEEK · ${weightUnit.toUpperCase()}`}
              />
            </Card>
          </Section>

          {/* What the training is made of. Volume rises just as well by
              adding easy sets, so the rep split is the check on it. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="layers-outline"
                tint={iconInk.violet}
                title="How you train"
                detail="Sets by rep range. Most programmes lean one way on purpose; this says which way yours actually leans."
              />
              <SegmentedShareBar
                segments={repBands.map((band) => ({
                  key: band.key,
                  label: band.label,
                  detail: band.detail,
                  share: band.share,
                  count: band.sets,
                  color: bandColors[band.key] ?? iconInk.ember,
                }))}
              />
            </Card>
          </Section>

          {/* Intensity. The one column on this page that only exists because
              RPE is a Fortress field -- a free account has no data here at
              all, which is the honest version of a paid feature. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="flame-outline"
                tint={iconInk.crimson}
                title="Intensity"
                detail="Average RPE per week, across the sets you rated. Volume says how much; this says how hard."
              />
              {intensity.averageRpe === null ? (
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  No sets in this period carry an RPE. Add one while logging and this fills in.
                </Text>
              ) : (
                <>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
                    <StatBlock label="Average RPE" value={intensity.averageRpe} precision={1} detail="out of 10" />
                    <StatBlock
                      label="Rated"
                      value={Math.round(intensity.coverage * 100)}
                      unit="%"
                      detail="of strength sets"
                    />
                  </View>
                  {/* Coverage drawn as well as stated: an 8.5 across a tenth
                      of the sets and an 8.5 across all of them are different
                      claims, and the bar is the faster way to see which. */}
                  <GrowBar share={intensity.coverage} color={iconInk.crimson} />
                  {rpePoints.length >= 2 ? (
                    <TrendChart points={rpePoints} color={iconInk.crimson} caption="AVERAGE RPE PER WEEK" height={130} />
                  ) : null}
                </>
              )}
            </Card>
          </Section>

          {/* Consistency. The finding here is usually a gap -- a weekday
              never trained -- which is why every day is drawn, including
              the empty ones. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="calendar-outline"
                tint={iconInk.azure}
                title="Consistency"
                detail="Which days you train, and how the sessions space out."
              />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
                <StatBlock label="Longest streak" value={consistency.longestStreak} detail="days in a row" />
                <StatBlock label="Weeks trained" value={consistency.activeWeeks} />
                <StatBlock
                  label="Rest"
                  value={consistency.averageRestDays ?? 0}
                  precision={1}
                  detail={consistency.averageRestDays === null ? 'one session' : 'days apart'}
                />
              </View>
              <WeekdayHistogram days={consistency.weekdays} tint={iconInk.azure} />
            </Card>
          </Section>

          {/* Strongest lifts, by the same estimate the progression list
              uses. Ranked rather than charted: the question is an order. */}
          {topLifts.length > 0 ? (
            <Section index={section++}>
              <Card>
                <CardHead
                  icon="trophy-outline"
                  tint={iconInk.amber}
                  title="Strongest lifts"
                  detail={`Best estimated one-rep max in this period. Capped at 12 reps, past which the estimate stops meaning much.`}
                />
                {topLifts.slice(0, 5).map((lift, i) => (
                  <AnimatedPressable
                    key={lift.exerciseId}
                    onPress={() =>
                      navigation.navigate('LiftDetail', {
                        exerciseId: lift.exerciseId,
                        exerciseName: lift.exerciseName,
                      })
                    }
                    scaleTo={0.99}
                    accessibilityRole="button"
                    accessibilityLabel={`${lift.exerciseName}, best estimated one-rep max ${lift.bestE1rm} ${weightUnit}. Opens this lift's record, goal and progression.`}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      <View
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: radius.pill,
                          backgroundColor: colors.border,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ color: colors.textPrimary, fontSize: 11, fontWeight: '800' }}>
                          {i + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                          {lift.exerciseName}
                        </Text>
                        <Text style={[typography.caption, { color: colors.textMuted }]}>
                          {shortDateLabel(lift.achievedOn)}
                        </Text>
                      </View>
                      <Text style={{ color: colors.textPrimary, fontWeight: '800', fontSize: 16 }}>
                        {lift.bestE1rm} {weightUnit}
                      </Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </Card>
            </Section>
          ) : null}

          {/* Cardio, only when there is any. An empty card headed "Cardio"
              on a lifter's screen is a reproach, not a report. */}
          {cardio ? (
            <Section index={section++}>
              <Card>
                <CardHead
                  icon="heart-outline"
                  tint={iconInk.rose}
                  title="Cardio"
                  detail="Everything logged as a cardio movement in this period."
                />
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.md }}>
                  <StatBlock label="Sessions" value={cardio.sessions} />
                  <StatBlock label="Minutes" value={cardio.minutes} />
                  <StatBlock label="Distance" value={cardio.distance} precision={1} unit={distanceUnit} />
                </View>
              </Card>
            </Section>
          ) : null}

            </>
          ) : null}

          {/* Muscle balance. Kept from the previous version of this screen,
              restyled onto the shared card head and the animated bar. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="body-outline"
                tint={iconInk.gold}
                title="Muscle balance"
                detail="Share of work per group. Strength counts volume; cardio counts minutes, so a running week doesn't read as an empty one."
              />
              {balance.map((entry, i) => (
                <View key={entry.category} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <IconWell
                      icon={CATEGORY_ICONS[entry.category] ?? DEFAULT_CATEGORY_ICON}
                      size={26}
                      tint={CATEGORY_INK[entry.category] ?? DEFAULT_CATEGORY_INK}
                    />
                    <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                      {entry.category[0].toUpperCase() + entry.category.slice(1)}
                    </Text>
                    <Text style={[typography.caption, { color: colors.textMuted }]}>
                      {entry.sets} set{entry.sets === 1 ? '' : 's'}
                    </Text>
                    <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '700', minWidth: 40, textAlign: 'right' }]}>
                      {Math.round(entry.share * 100)}%
                    </Text>
                  </View>
                  <GrowBar
                    share={entry.share}
                    color={CATEGORY_INK[entry.category] ?? DEFAULT_CATEGORY_INK}
                    delayMs={i * 60}
                  />
                </View>
              ))}
            </Card>
          </Section>

          {/* Per-lift progression. Last because it is the longest list and
              the most specific question on the page. */}
          <Section index={section++}>
            <Card>
              <CardHead
                icon="barbell-outline"
                tint={iconInk.mint}
                title="Strength progression"
                detail="Estimated one-rep max, first to latest session. Lifts logged on only one day are left out, since there's no trend in a single point."
              />
              {progressions.length === 0 ? (
                <Text style={[typography.body, { color: colors.textSecondary }]}>
                  No lift has two separate days in this period yet.
                </Text>
              ) : (
                progressions.map((p) => {
                  const up = p.changePct > 0;
                  const flat = p.changePct === 0;
                  const tint = flat ? colors.textMuted : up ? colors.success : colors.danger;
                  return (
                    <AnimatedPressable
                      key={p.exerciseId}
                      onPress={() =>
                        navigation.navigate('LiftDetail', {
                          exerciseId: p.exerciseId,
                          exerciseName: p.exerciseName,
                        })
                      }
                      scaleTo={0.99}
                      accessibilityRole="button"
                      accessibilityLabel={`${p.exerciseName}, ${p.changePct} percent. Opens this lift's record, goal and progression.`}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={[typography.body, { color: colors.textPrimary }]} numberOfLines={1}>
                            {p.exerciseName}
                          </Text>
                          <Text style={[typography.caption, { color: colors.textMuted }]}>
                            {p.first} → {p.latest} {weightUnit} · {p.points.length} sessions
                          </Text>
                        </View>
                        {/* The middle of the series, which was already being
                            computed and then reduced to its two ends. A steady
                            climb and a lift that spiked early then slid produce
                            the same first, latest and percentage; only the shape
                            tells them apart. */}
                        <Sparkline
                          values={p.points.map((point) => point.estimatedOneRepMax)}
                          color={tint}
                          accessibilityLabel={`${p.exerciseName} across ${p.points.length} sessions, ${p.first} to ${p.latest} ${weightUnit}`}
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                          <Ionicons
                            name={flat ? 'remove' : up ? 'arrow-up' : 'arrow-down'}
                            size={14}
                            color={tint}
                          />
                          <Text style={{ color: tint, fontWeight: '700' }}>{Math.abs(p.changePct)}%</Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  );
                })
              )}
            </Card>
          </Section>
        </>
      )}
    </ScreenContainer>
  );
}
