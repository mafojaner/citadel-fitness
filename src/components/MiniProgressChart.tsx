import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useProgressSeries } from '../hooks/useProgressSeries';
import { addDays, todayISO } from '../lib/analytics';
import { useProfileStore } from '../state/profileStore';
import { useTheme } from '../theme/useTheme';

const CHART_HEIGHT = 130;
/** Room the chart reserves for its own y-axis labels, so the plot gets the rest. */
const Y_AXIS_ALLOWANCE = 52;

/**
 * A read-only last-7-days version of the Activity tab's progress chart, for
 * the Home summary card. Deliberately none of that screen's controls — no
 * range preset, chart type, category filter or pointer tooltip: this is a
 * glance at the trend, and tapping the card it sits in goes to the full
 * chart where all of that lives.
 */
export function MiniProgressChart() {
  const { colors, spacing, typography } = useTheme();
  const units = useProfileStore((s) => s.preferences.units);
  const today = todayISO();
  const { points, metric, loading, error } = useProgressSeries('all', addDays(today, -6), today, units);
  const [width, setWidth] = useState(0);

  // Same web-only fix the Activity chart needs: gifted-charts sizes its <svg>
  // to fit the data-point radius below the axis, but flexbox shrinks it back
  // to the bare plot height and clips points sitting at zero. See the longer
  // note in ActivityScreen.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const id = 'mini-progress-chart-svg-fix';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = '#mini-progress-chart svg { flex-shrink: 0 !important; }';
    document.head.appendChild(style);
  }, []);

  if (error) return null;

  // Ink, not the accent. This chart sits on the Home summary card among
  // cards that have all gone monochrome, and orange now means "paid" -- an
  // orange trend line would be reading as an advertisement for a feature
  // every account already has.
  const accent = colors.textPrimary;
  const data = points.map((p) => ({ value: p.value, label: p.label }));
  const hasValue = points.some((p) => p.value > 0);
  const plotWidth = Math.max(width - Y_AXIS_ALLOWANCE, 0);
  const spacingBetween = data.length > 1 ? (plotWidth - 20) / (data.length - 1) : plotWidth;

  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '700' }]}>
        {metric === 'minutes' ? 'CARDIO MINUTES' : 'VOLUME'} · LAST 7 DAYS
      </Text>
      <View
        nativeID="mini-progress-chart"
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%', minHeight: CHART_HEIGHT }}
      >
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : width > 0 ? (
          <LineChart
            data={data}
            width={plotWidth}
            height={CHART_HEIGHT}
            initialSpacing={10}
            endSpacing={10}
            spacing={spacingBetween}
            color={accent}
            thickness={2}
            isAnimated
            animationDuration={700}
            areaChart
            startFillColor={accent}
            endFillColor={accent}
            startOpacity={0.32}
            endOpacity={0.02}
            hideDataPoints={!hasValue}
            dataPointsColor={accent}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            noOfSections={3}
            disableScroll
          />
        ) : null}
      </View>
    </View>
  );
}
