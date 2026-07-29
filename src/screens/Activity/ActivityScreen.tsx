import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { Card } from '../../components/Card';
import { DateRangeCalendar } from '../../components/DateRangeCalendar';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StatTile } from '../../components/StatTile';
import { CATEGORY_FILTERS, CATEGORY_GRADIENTS } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useProgressSeries } from '../../hooks/useProgressSeries';
import { useRewards } from '../../hooks/useRewards';
import { addDays, todayISO } from '../../lib/analytics';
import type { RewardDay, RewardWeek } from '../../lib/rewards';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import { gradients } from '../../theme/tokens';
import type { Category } from '../../types/models';

const REWARD_DAY_HEADER_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function RewardDayCircle({ day }: { day: RewardDay }) {
  const { colors } = useTheme();
  const isTodayUnlogged = day.isToday && !day.logged;

  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: day.logged ? 2 : 0,
          borderColor: colors.primary,
          backgroundColor: isTodayUnlogged ? colors.textPrimary : 'transparent',
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: day.logged ? '700' : '500',
            color: isTodayUnlogged ? colors.background : day.isFuture ? colors.textMuted : colors.textPrimary,
            opacity: day.isFuture ? 0.4 : 1,
          }}
        >
          {day.dayNumber}
        </Text>
      </View>
    </View>
  );
}

function RewardWeekRow({ week }: { week: RewardWeek }) {
  const { colors, spacing } = useTheme();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
      {week.days.map((day) => (
        <RewardDayCircle key={day.date} day={day} />
      ))}
      <View
        style={{
          width: 44,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: week.complete ? colors.primary : 'transparent',
          borderWidth: week.complete ? 0 : 1,
          borderColor: colors.border,
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: week.complete ? '#FFFFFF' : colors.textMuted,
          }}
        >
          {week.daysLogged}/{4}
        </Text>
      </View>
    </View>
  );
}

type RangePreset = '7d' | '30d' | '90d' | 'custom';

const RANGE_PRESETS: { label: string; value: RangePreset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

const CHART_TYPE_OPTIONS = [
  { label: 'Line chart', value: 'line' as const, icon: 'trending-up-outline' as const },
  { label: 'Bar chart', value: 'bar' as const, icon: 'bar-chart-outline' as const },
];

function formatRangeDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function ActivityScreen() {
  const { colors, spacing, typography } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [rangePreset, setRangePreset] = useState<RangePreset>('7d');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [optionsOpen, setOptionsOpen] = useState(false);

  const today = todayISO();
  const [customRange, setCustomRange] = useState({ start: addDays(today, -6), end: today });

  const { start, end } =
    rangePreset === 'custom'
      ? customRange
      : rangePreset === '30d'
        ? { start: addDays(today, -29), end: today }
        : rangePreset === '90d'
          ? { start: addDays(today, -89), end: today }
          : { start: addDays(today, -6), end: today };

  const units = useProfileStore((s) => s.preferences.units);

  const {
    points,
    bucketing,
    metric,
    loading: seriesLoading,
    error: seriesError,
  } = useProgressSeries(activeCategory, start, end, units);

  const {
    currentStreakDays,
    workoutsThisWeek,
    totalVolumeThisWeek,
    loading: summaryLoading,
    error: summaryError,
  } = useActivityAnalytics(activeCategory, units);

  const {
    weeklyStreak,
    rewardsEarned,
    weeksIntoCurrentCycle,
    weeksPerReward,
    weeklyTargetDays,
    weeks: rewardWeeks,
    loading: rewardsLoading,
    error: rewardsError,
    reload: reloadRewards,
  } = useRewards();
  const weeksToGo = weeksPerReward - weeksIntoCurrentCycle;

  const isMinutes = metric === 'minutes';
  const [chartWidth, setChartWidth] = useState(0);

  // react-native-gifted-charts sizes its <svg> to fit the data-point radius
  // below the x-axis, but on web flexbox shrinks it back to the bare plot
  // height — so points sitting at zero get their bottom half clipped. No prop
  // the library exposes (height, overflowTop, overflowBottom) reaches that
  // element. Blocking the shrink is enough; clipping stays on, so nothing can
  // bleed into neighbouring cards.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'progress-chart-svg-fix';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '#progress-chart svg { flex-shrink: 0 !important; }';
    document.head.appendChild(style);
  }, []);

  const chartAccentGradient = activeCategory === 'all' ? gradients.action : CATEGORY_GRADIENTS[activeCategory];
  const chartAccent = chartAccentGradient?.[chartAccentGradient.length - 1] ?? colors.primary;

  const chartData = points.map((p) => ({ value: p.value, label: p.label, date: p.date }));
  const hasValue = points.some((p) => p.value > 0);

  // Longer labels (week/month bucket dates) need more room per point than
  // weekday abbreviations do — give each a fixed minimum so labels never
  // truncate or collide, and let the chart scroll horizontally instead of
  // squeezing everything into the container width.
  const minPointSpacing = bucketing === 'day' ? 40 : bucketing === 'week' ? 56 : 64;
  const plotWidth = Math.max(chartWidth - 55, 0);
  const fitSpacing = plotWidth > 0 ? (plotWidth - 20) / Math.max(chartData.length - 1, 1) : 0;
  const pointSpacing = Math.max(minPointSpacing, fitSpacing);
  const contentWidth = pointSpacing * Math.max(chartData.length - 1, 1) + 40;
  const scrollNeeded = contentWidth > plotWidth;
  const renderWidth = scrollNeeded ? contentWidth : plotWidth;

  const peak = useMemo(() => {
    if (points.length === 0) return null;
    return points.reduce((best, p) => (p.value > best.value ? p : best), points[0]);
  }, [points]);

  const onChartAreaLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  const unitLabel = isMinutes ? 'min' : units;
  const bucketWord = bucketing === 'day' ? 'Daily' : bucketing === 'week' ? 'Weekly' : 'Monthly';
  const metricWord = isMinutes ? 'cardio minutes' : `volume (reps × weight, ${units})`;

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CATEGORY_FILTERS.map((c) => (
          <GradientPill
            key={c.value}
            label={c.label}
            active={c.value === activeCategory}
            onPress={() => setActiveCategory(c.value)}
            colors={c.value === 'all' ? undefined : CATEGORY_GRADIENTS[c.value as Category]}
          />
        ))}
      </View>

      {summaryError ? <ErrorNotice message={summaryError} /> : null}

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Progress</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {bucketWord} {metricWord} · {formatRangeDate(start)} – {formatRangeDate(end)}
            </Text>
          </View>
          <Pressable
            onPress={() => setOptionsOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Graph options"
            hitSlop={8}
            style={({ pressed }) => ({
              padding: spacing.xs,
              opacity: pressed ? 0.6 : 1,
              backgroundColor: optionsOpen ? colors.primaryMuted : 'transparent',
              borderRadius: 999,
            })}
          >
            <Ionicons name="options-outline" size={22} color={optionsOpen ? colors.primary : colors.textMuted} />
          </Pressable>
        </View>

        {optionsOpen ? (
          <View
            style={{
              gap: spacing.md,
              padding: spacing.md,
              borderRadius: 12,
              backgroundColor: colors.background,
            }}
          >
            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
                RANGE
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {RANGE_PRESETS.map((preset) => (
                  <GradientPill
                    key={preset.value}
                    label={preset.label}
                    active={rangePreset === preset.value}
                    onPress={() => setRangePreset(preset.value)}
                  />
                ))}
              </View>
              {rangePreset === 'custom' ? (
                <DateRangeCalendar
                  start={customRange.start}
                  end={customRange.end}
                  onChange={(s, e) => setCustomRange({ start: s, end: e })}
                />
              ) : null}
            </View>

            <View style={{ gap: spacing.xs }}>
              <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
                CHART TYPE
              </Text>
              <SegmentedControl options={CHART_TYPE_OPTIONS} value={chartType} onChange={setChartType} />
            </View>
          </View>
        ) : null}

        {seriesError ? null : seriesLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View nativeID="progress-chart" onLayout={onChartAreaLayout} style={{ width: '100%' }}>
            {chartWidth > 0 ? (
              <ScrollView
                horizontal
                scrollEnabled={scrollNeeded}
                showsHorizontalScrollIndicator={false}
                // ScrollView clips vertically, which would shave the marker
                // sitting on the highest data point.
                contentContainerStyle={{ paddingTop: 16 }}
              >
                {chartType === 'line' ? (
                  <LineChart
                    data={chartData}
                    width={renderWidth}
                    initialSpacing={10}
                    endSpacing={10}
                    spacing={pointSpacing}
                    color={chartAccent}
                    thickness={2}
                    // Deliberately not `curved`. Any spline interpolates
                    // *between* the real data points, which let the line bow
                    // below zero on flat runs — negative volume. Straight
                    // segments only ever join actual values, so peaks stay
                    // sharp and the line can never leave the plotted range.
                    isAnimated
                    animationDuration={700}
                    areaChart
                    startFillColor={chartAccent}
                    endFillColor={chartAccent}
                    startOpacity={0.32}
                    endOpacity={0.02}
                    hideDataPoints={!hasValue}
                    dataPointsColor={chartAccent}
                    yAxisColor={colors.border}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
                    noOfSections={3}
                    height={160}
                    pointerConfig={{
                      pointerColor: chartAccent,
                      pointerStripColor: colors.border,
                      pointerStripWidth: 1,
                      radius: 5,
                      activatePointersInstantlyOnTouch: true,
                      autoAdjustPointerLabelPosition: true,
                      pointerLabelComponent: (items: { value: number; date: string }[]) => {
                        const item = items[0];
                        return (
                          <View
                            style={{
                              backgroundColor: colors.surface,
                              borderColor: colors.border,
                              borderWidth: 1,
                              borderRadius: 8,
                              paddingVertical: 4,
                              paddingHorizontal: 8,
                            }}
                          >
                            <Text style={{ color: colors.textMuted, fontSize: 10 }}>
                              {formatRangeDate(item.date)}
                            </Text>
                            <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 13 }}>
                              {Math.round(item.value).toLocaleString()} {unitLabel}
                            </Text>
                          </View>
                        );
                      },
                    }}
                  />
                ) : (
                  <BarChart
                    data={chartData}
                    width={renderWidth}
                    height={160}
                    frontColor={chartAccent}
                    showGradient
                    gradientColor={colors.surface}
                    barBorderRadius={4}
                    barWidth={Math.max(8, Math.min(28, pointSpacing - 16))}
                    spacing={Math.max(8, pointSpacing - Math.max(8, Math.min(28, pointSpacing - 16)))}
                    isAnimated
                    animationDuration={700}
                    yAxisColor={colors.border}
                    xAxisColor={colors.border}
                    yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                    xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
                    noOfSections={3}
                  />
                )}
              </ScrollView>
            ) : null}
          </View>
        )}

        {seriesError ? (
          <ErrorNotice message={seriesError} />
        ) : !seriesLoading && !hasValue ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {isMinutes
              ? 'Log a cardio session to start charting your minutes.'
              : 'Log a workout to start charting your volume.'}
          </Text>
        ) : !seriesLoading && peak && peak.value > 0 ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Peak: {Math.round(peak.value).toLocaleString()} {unitLabel} on {formatRangeDate(peak.date)}
          </Text>
        ) : null}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="diamond" colors={gradients.flame} size={44} />
          <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {weeklyStreak} week streak
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Log a workout on {weeklyTargetDays} days a week to keep it going.
            </Text>
          </View>
        </View>
      </Card>

      {rewardsError ? <ErrorNotice message={rewardsError} onRetry={reloadRewards} /> : null}

      <Card title="This cycle">
        {rewardsLoading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {REWARD_DAY_HEADER_LABELS.map((label, i) => (
                <Text
                  key={i}
                  style={[
                    typography.caption,
                    { flex: 1, textAlign: 'center', color: colors.textMuted },
                  ]}
                >
                  {label}
                </Text>
              ))}
              <View style={{ width: 44 }}>
                <Ionicons name="checkmark" size={16} color={colors.textMuted} style={{ alignSelf: 'center' }} />
              </View>
            </View>

            {rewardWeeks.map((week) => (
              <RewardWeekRow key={week.weekStart} week={week} />
            ))}
          </View>
        )}
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="pricetag" colors={gradients.identity} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>
              {rewardsEarned > 0
                ? `${rewardsEarned} reward${rewardsEarned === 1 ? '' : 's'} earned`
                : 'No rewards earned yet'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {weeksIntoCurrentCycle} of {weeksPerReward} weeks toward your next 10% off — {weeksToGo}{' '}
              more complete week{weeksToGo === 1 ? '' : 's'} to go.
            </Text>
          </View>
        </View>
      </Card>

      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Rewards track your consistency now. Redeeming 10% off a premium membership isn&apos;t live yet —
        we&apos;ll let you know here as soon as it is.
      </Text>

      <Text style={[typography.subheading, { color: colors.textPrimary }]}>Analytics Summary</Text>
      {summaryError ? null : summaryLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <StatTile
            icon="flame"
            gradientColors={gradients.flame}
            value={`${currentStreakDays}`}
            label={`Day${currentStreakDays === 1 ? '' : 's'} streak`}
          />
          <StatTile
            icon="calendar"
            gradientColors={gradients.calendar}
            value={`${workoutsThisWeek}`}
            label={`Workout${workoutsThisWeek === 1 ? '' : 's'} this week`}
          />
          <StatTile
            icon={isMinutes ? 'time' : 'barbell'}
            gradientColors={isMinutes ? gradients.pulse : gradients.volume}
            value={totalVolumeThisWeek.toLocaleString()}
            label={isMinutes ? 'Cardio min this week' : `${units} volume this week`}
          />
        </View>
      )}
    </ScreenContainer>
  );
}
