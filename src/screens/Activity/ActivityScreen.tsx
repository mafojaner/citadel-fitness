import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { FortressFeatureCard } from '../../components/FortressFeatureCard';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { GradientPill } from '../../components/GradientPill';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { RankAvatar } from '../../components/RankAvatar';
import { ScreenContainer } from '../../components/ScreenContainer';
import { SegmentedControl } from '../../components/SegmentedControl';
import { StatTile } from '../../components/StatTile';
import { CATEGORY_FILTERS, CATEGORY_GRADIENTS } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import { useProgressSeries } from '../../hooks/useProgressSeries';
import { useRewards } from '../../hooks/useRewards';
import { addDays, todayISO } from '../../lib/analytics';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import { gradients } from '../../theme/tokens';
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

function RankingCard() {
  const { colors, spacing, radius, typography, scheme } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const userId = useAuthStore((s) => s.session?.user.id);
  const { entries, loading, error } = useLeaderboard();

  const myRank = entries.findIndex((e) => e.userId === userId);
  const top = entries.slice(0, 3);

  return (
    <AnimatedPressable
      onPress={() => navigation.navigate('Leaderboard')}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel="Open leaderboard"
    >
      <View
        style={{
          borderRadius: radius.lg,
          overflow: 'hidden',
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: gradients.rankGold[1],
          shadowOpacity: scheme === 'dark' ? 0.3 : 0.16,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        <LinearGradient
          colors={scheme === 'dark' ? ['#3A2A0F', '#1C2230'] : ['#FFF6E0', '#FFFFFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: spacing.md, gap: spacing.md }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 }}>
              <GradientIconBadge icon="trophy" colors={gradients.rankGold} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: spacing.xs }}>
                <Text style={[typography.subheading, { color: colors.textPrimary }]}>Activity ranking</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                  {loading
                    ? 'Loading...'
                    : error
                      ? "Couldn't load the ranking"
                      : entries.length === 0
                        ? 'Log a workout to enter this week'
                        : myRank >= 0
                          ? `You're #${myRank + 1} this week`
                          : `${entries.length} member${entries.length === 1 ? '' : 's'} ranked this week`}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {!loading && !error && top.length > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-evenly' }}>
              {top.map((entry, index) => (
                <View key={entry.userId} style={{ alignItems: 'center', gap: spacing.xs, maxWidth: 92 }}>
                  <RankAvatar rank={index + 1} avatarUrl={entry.avatarUrl} size={40} />
                  <Text
                    style={[typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}
                    numberOfLines={1}
                  >
                    {entry.userId === userId ? 'You' : entry.displayName}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </LinearGradient>
      </View>
    </AnimatedPressable>
  );
}

function RewardsCard() {
  const { spacing, radius, typography } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ActivityStackParamList>>();
  const { weeklyStreak, rewardsEarned, loading } = useRewards();

  return (
    <AnimatedPressable onPress={() => navigation.navigate('Rewards')} scaleTo={0.98}>
      <View
        style={{
          backgroundColor: '#FF5A36',
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
          shadowColor: '#FF5A36',
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="diamond" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: '#FFFFFF' }]}>Rewards</Text>
            <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
              {loading
                ? 'Loading...'
                : `${weeklyStreak} week streak · ${rewardsEarned} reward${rewardsEarned === 1 ? '' : 's'} earned`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.85)" />
        </View>
        <Text style={[typography.caption, { color: 'rgba(255,255,255,0.85)', fontWeight: '600' }]}>
          Tap to view your rewards
        </Text>
      </View>
    </AnimatedPressable>
  );
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

      <RankingCard />

      {/* Directly below the public leaderboard it extends: a private,
          invite-only version of the same ranking concept. */}
      <FortressFeatureCard
        featureId="private-groups"
        onOpen={() => navigation.navigate('Groups')}
      />

      <RewardsCard />

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

      {/* Both sit under Analytics Summary because that's the section they
          extend: deeper cuts of the same workout history the tiles above
          summarise. */}
      <Text style={[typography.subheading, { color: colors.textPrimary }]}>Going deeper</Text>
      {/* Built — members get the feature itself rather than a teaser. */}
      <FortressFeatureCard
        featureId="advanced-analytics"
        onOpen={() => navigation.navigate('AdvancedAnalytics')}
      />
      <FortressFeatureCard
        featureId="pr-vault"
        onOpen={() => navigation.navigate('PersonalRecords')}
      />
      <FortressFeatureCard
        featureId="goal-forecasting"
        onOpen={() => navigation.navigate('GoalForecast')}
      />
      </ScreenContainer>
    </View>
  );
}
