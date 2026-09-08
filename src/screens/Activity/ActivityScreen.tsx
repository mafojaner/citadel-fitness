import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { CategoryFilterPicker } from '../../components/CategoryFilterPicker';
import { DateRangeCalendar } from '../../components/DateRangeCalendar';
import { ErrorNotice } from '../../components/ErrorNotice';
import { PaidFeatureLink, PaidFeatureList } from '../../components/PaidFeatureCard';
import { IconWell } from '../../components/IconWell';
import { GradientPill } from '../../components/GradientPill';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StatTile } from '../../components/StatTile';
import { CATEGORY_FILTERS } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useProgressSeries } from '../../hooks/useProgressSeries';
import { useRewards } from '../../hooks/useRewards';
import { addDays, todayISO } from '../../lib/analytics';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import { iconInk } from '../../theme/tokens';
import type { Category } from '../../types/models';
import type { ActivityStackParamList } from '../../navigation/stacks/ActivityStack';

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

function RewardsCard() {
  const { colors, spacing, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const { weeklyStreak, rewardsEarned, loading } = useRewards();

  return (
    <AnimatedPressable
      onPress={() => navigation.navigate('Rewards')}
      accessibilityRole="button"
      accessibilityLabel="Rewards and streak"
      scaleTo={0.98}
    >
      {/* A card, where this was a solid orange slab with white type on it.
          It was the loudest thing on the screen and it is a free feature, so
          under the rule that colour marks what a membership buys it was
          making precisely the wrong promise -- and it sat directly above the
          Fortress card it was drowning out. */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <IconWell icon="diamond" tint={iconInk.amber} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Rewards</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
              {loading
                ? 'Loading...'
                : `${weeklyStreak} week streak · ${rewardsEarned} reward${rewardsEarned === 1 ? '' : 's'} earned`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>
          Tap to view your rewards
        </Text>
      </Card>
    </AnimatedPressable>
  );
}

export function ActivityScreen() {
  const { colors, spacing, typography } = useTheme();
  // This screen navigated to four of its own routes without ever declaring
  // `navigation`. It compiled, because on web `navigation` resolves to the
  // DOM's global Navigation API, whose navigate() legitimately takes a URL
  // string — so `navigation.navigate('PersonalRecords')` type-checked as a
  // browser navigation to a relative path. At runtime it reloaded the app
  // instead of pushing a screen, which looked exactly like a dead link:
  // no error, no warning, just a bounce back to Home.
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
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

  // One ink for every category, where this used to take the saturated end
  // of the active category's gradient. The colour was decoration rather
  // than encoding: the chart shows one series at a time and the picker
  // above it already says which, so the hue changed under you without ever
  // telling you anything.
  const chartAccent = colors.textPrimary;

  const hasValue = points.some((p) => p.value > 0);

  // Longer labels (week/month bucket dates) need more room per point than
  // weekday abbreviations do — give each a fixed minimum so labels never
  // truncate or collide, and let the chart scroll horizontally instead of
  // squeezing everything into the container width.
  const minPointSpacing = bucketing === 'day' ? 40 : bucketing === 'week' ? 56 : 64;
  const plotWidth = Math.max(chartWidth - 55, 0);
  const fitSpacing = plotWidth > 0 ? (plotWidth - 10) / Math.max(points.length - 1, 1) : 0;
  const pointSpacing = Math.max(minPointSpacing, fitSpacing);
  // The first label is left-aligned so it clears the axis, now that the line
  // starts on it -- see the note in components/analytics/TrendChart. Built
  // after `pointSpacing` because it needs it, and off `points` so the
  // spacing above does not have to read back off these rows.
  const axisLabelStyle = { color: colors.textMuted, fontSize: 10 };
  const chartData = points.map((p, i) => ({
    value: p.value,
    label: p.label,
    date: p.date,
    labelTextStyle:
      i === 0
        ? { ...axisLabelStyle, textAlign: 'left' as const, paddingLeft: pointSpacing / 2 }
        : axisLabelStyle,
  }));
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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Activity" showSearch={false} />
      <ScreenContainer>
      <CategoryFilterPicker options={CATEGORY_FILTERS} value={activeCategory} onChange={setActiveCategory} />

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
                    // Flush to the axis: at 10 the series began a step
                    // inside its own frame, with the area fill starting in
                    // mid-air. The bar chart below keeps its inset, because
                    // a bar touching the axis reads as clipped.
                    initialSpacing={0}
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

        {/* The offer belongs on the chart it deepens, not in a card further
            down the screen. This one plots one series over time; advanced
            analytics is the same history cut by muscle group and lift, so
            the moment to mention it is while you're reading the shallow
            version. */}
        <PaidFeatureLink
          featureId="advanced-analytics"
          label="See the full breakdown"
          onOpen={() => navigation.navigate('AdvancedAnalytics')}
        />
      </Card>

      {/* The ranking and its private-groups counterpart both moved to Home,
          which is where the two cards they now sit under already live. This
          screen is where you go to look into your training; those two are a
          glance at where you stand, which is what Home is for. */}
      <RewardsCard />

      <Text style={[typography.subheading, { color: colors.textPrimary }]}>Analytics Summary</Text>
      {summaryError ? null : summaryLoading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          <StatTile
            icon="flame"
            tint={iconInk.amber}
            value={`${currentStreakDays}`}
            label={`Day${currentStreakDays === 1 ? '' : 's'} streak`}
          />
          <StatTile
            icon="calendar"
            tint={iconInk.ember}
            value={`${workoutsThisWeek}`}
            label={`Workout${workoutsThisWeek === 1 ? '' : 's'} this week`}
          />
          <StatTile
            icon={isMinutes ? 'time' : 'barbell'}
            tint={iconInk.cyan}
            value={totalVolumeThisWeek.toLocaleString()}
            label={isMinutes ? 'Cardio min this week' : `${units} volume this week`}
          />
        </View>
      )}

      {/* Two cards, split on the line the catalogue itself draws, where
          this was one plain card holding five text links.
          *
          * As links they were the quietest thing on a screen whose paid
          * cards announce themselves with a shield, a tier name, a coloured
          * disc and a state pill -- five of the app's most valuable
          * features rendered as a settings list, under a card with no
          * heading, at the very bottom of the scroll. They are the same
          * offers the cards make and they now look like it.
          *
          * The split is not cosmetic. The first pair is what you did; the
          * second is what to do next, and that is exactly where Fortress
          * ends and Valhalla begins -- so one heading could not have been
          * honest about both. */}
      <PaidFeatureList
        items={[
          {
            featureId: 'pr-vault',
            label: 'Your personal records',
            onOpen: () => navigation.navigate('PersonalRecords'),
          },
          {
            featureId: 'goal-forecasting',
            label: 'Set a target and track it',
            onOpen: () => navigation.navigate('GoalForecast'),
          },
        ]}
      />

      {/* The three a person answers rather than an algorithm -- or in the
          first case, an algorithm reading your numbers where the other two
          are a coach watching the rep. They answer the same question from
          opposite ends, so they belong together. */}
      <PaidFeatureList
        items={[
          {
            featureId: 'ai-progressive-overload',
            label: 'What to lift next',
            onOpen: () => navigation.navigate('Overload'),
          },
          {
            featureId: 'form-check',
            label: 'Get a lift reviewed',
            onOpen: () => navigation.navigate('FormCheck'),
          },
          {
            featureId: 'nutrition-coaching',
            label: 'Get macro targets set',
            onOpen: () => navigation.navigate('NutritionCoaching'),
          },
        ]}
      />
      </ScreenContainer>
    </View>
  );
}
