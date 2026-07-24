import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Card } from '../../components/Card';
import { ScreenContainer } from '../../components/ScreenContainer';
import { CATEGORY_FILTERS } from '../../constants/categories';
import { useActivityAnalytics } from '../../hooks/useActivityAnalytics';
import { useTheme } from '../../theme/useTheme';
import type { Category } from '../../types/models';

export function ActivityScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const { progressSeries, workoutsThisWeek, currentStreakDays, totalVolumeThisWeek, loading } =
    useActivityAnalytics(activeCategory);

  const chartData = progressSeries.map((p) => ({ value: p.value, label: p.label }));
  const hasVolume = progressSeries.some((p) => p.value > 0);

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
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            <LineChart
              data={chartData}
              color={colors.primary}
              thickness={2}
              hideDataPoints={!hasVolume}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
              yAxisTextStyle={{ color: colors.textMuted }}
              xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
              noOfSections={3}
              height={160}
            />
            {!hasVolume ? (
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                Volume (reps × weight) logged over the last 7 days will chart here.
              </Text>
            ) : null}
          </>
        )}
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
                {totalVolumeThisWeek.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </Card>
    </ScreenContainer>
  );
}
