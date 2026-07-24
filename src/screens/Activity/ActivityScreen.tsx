import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, type LayoutChangeEvent } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CATEGORY_FILTERS } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useProfileStore } from '../../state/profileStore';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';

export function ActivityScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const { progressSeries, workoutsThisWeek, currentStreakDays, totalVolumeThisWeek, loading } =
    useActivityAnalytics(activeCategory);
  const units = useProfileStore((s) => s.preferences.units);
  const [chartWidth, setChartWidth] = useState(0);

  const chartData = progressSeries.map((p) => ({ value: p.value, label: p.label }));
  const hasVolume = progressSeries.some((p) => p.value > 0);

  const onChartAreaLayout = (e: LayoutChangeEvent) => {
    setChartWidth(e.nativeEvent.layout.width);
  };

  return (
    <ScreenContainer>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {CATEGORY_FILTERS.map((c) => {
          const active = c.value === activeCategory;
          return (
            <Pressable
              key={c.value}
              onPress={() => setActiveCategory(c.value)}
              style={{
                paddingVertical: spacing.xs,
                paddingHorizontal: spacing.md,
                borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.surface,
                borderWidth: 1,
                borderColor: active ? colors.primary : colors.border,
              }}
            >
              <Text style={{ color: active ? colors.surface : colors.textSecondary }}>
                {c.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card title="Progress">
        <Text style={[typography.caption, { color: colors.textMuted }]}>
          Daily volume — reps × weight ({units}) logged over the last 7 days
        </Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View onLayout={onChartAreaLayout} style={{ width: '100%' }}>
            {chartWidth > 0 ? (
              <LineChart
                data={chartData}
                width={chartWidth - 55}
                initialSpacing={10}
                endSpacing={10}
                spacing={(chartWidth - 55 - 20) / Math.max(chartData.length - 1, 1)}
                color={colors.primary}
                thickness={2}
                hideDataPoints={!hasVolume}
                yAxisColor={colors.border}
                xAxisColor={colors.border}
                yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
                noOfSections={3}
                height={160}
              />
            ) : null}
          </View>
        )}
        {!loading && !hasVolume ? (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            Log a workout to start charting your volume.
          </Text>
        ) : null}
      </Card>

      <Card title="Analytics Summary">
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <View style={{ gap: spacing.md }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Ionicons name="flame-outline" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                Current streak
              </Text>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {currentStreakDays} day{currentStreakDays === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Ionicons name="calendar-outline" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                This week
              </Text>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {workoutsThisWeek} workout{workoutsThisWeek === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
              <Ionicons name="barbell-outline" size={20} color={colors.primary} />
              <Text style={[typography.body, { color: colors.textPrimary, flex: 1, minWidth: 0 }]}>
                Total volume this week
              </Text>
              <Text style={[typography.subheading, { color: colors.textPrimary }]}>
                {totalVolumeThisWeek.toLocaleString()} {units}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}
