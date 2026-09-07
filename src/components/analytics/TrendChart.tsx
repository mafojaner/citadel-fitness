import { useEffect, useState } from 'react';
import { Platform, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { useTheme } from '../../theme/useTheme';

export interface TrendPoint {
  value: number;
  label: string;
}

interface TrendChartProps {
  points: TrendPoint[];
  /** Line and fill colour. */
  color: string;
  height?: number;
  /** Drawn above the plot, in the muted caps the analytics cards use. */
  caption?: string;
  /** Appended to each y-axis reading. */
  unitSuffix?: string;
}

const Y_AXIS_ALLOWANCE = 52;
const SVG_FIX_ID = 'analytics-trend-chart-svg-fix';

/**
 * A line over time, for the analytics screen's weekly series.
 *
 * Same library and the same web workaround as the Activity chart:
 * gifted-charts sizes its <svg> to fit the data-point radius below the
 * axis, and flexbox then shrinks it back to the bare plot height, clipping
 * any point sitting at zero. A zero week is exactly the reading someone
 * opens this screen to find, so the fix is not optional here.
 *
 * Draws nothing below two points rather than a chart with one dot in it: a
 * single week is not a trend, and a plot of it invites a conclusion the
 * data cannot support.
 */
export function TrendChart({ points, color, height = 150, caption, unitSuffix }: TrendChartProps) {
  const { colors, spacing, typography } = useTheme();
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (document.getElementById(SVG_FIX_ID)) return;
    const style = document.createElement('style');
    style.id = SVG_FIX_ID;
    style.textContent = `#${SVG_FIX_ID}-host svg { flex-shrink: 0 !important; }`;
    document.head.appendChild(style);
  }, []);

  if (points.length < 2) {
    return (
      <Text style={[typography.caption, { color: colors.textMuted }]}>
        Two weeks of training are needed before a trend means anything.
      </Text>
    );
  }

  const plotWidth = Math.max(width - Y_AXIS_ALLOWANCE, 0);
  const spacingBetween = points.length > 1 ? (plotWidth - 20) / (points.length - 1) : plotWidth;

  /**
   * Only every Nth tick keeps its label.
   *
   * The series is one point per week, so "all time" grows without bound --
   * a year is fifty-two labels in a phone's width, which overlap into a
   * grey smear rather than degrading gracefully. Six or so is what fits.
   * The points themselves are all still drawn; it is only the labels that
   * thin out, so the shape of the line is unaffected.
   *
   * Anchored to the end rather than the start, so the most recent week is
   * always labelled -- it is the one being read, and an unlabelled right
   * edge is the one gap that actually costs the reader something.
   */
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const plotted = points.map((point, i) => ({
    value: point.value,
    label: (points.length - 1 - i) % labelStep === 0 ? point.label : '',
  }));

  return (
    <View style={{ gap: spacing.xs }}>
      {caption ? (
        <Text
          style={[typography.caption, { color: colors.textMuted, fontWeight: '700', letterSpacing: 0.6 }]}
        >
          {caption}
        </Text>
      ) : null}
      <View
        nativeID={`${SVG_FIX_ID}-host`}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ width: '100%', minHeight: height }}
      >
        {width > 0 ? (
          <LineChart
            data={plotted}
            width={plotWidth}
            height={height}
            initialSpacing={10}
            endSpacing={10}
            spacing={spacingBetween}
            color={color}
            thickness={2}
            isAnimated
            animationDuration={700}
            areaChart
            startFillColor={color}
            endFillColor={color}
            startOpacity={0.3}
            endOpacity={0.02}
            dataPointsColor={color}
            dataPointsRadius={3}
            yAxisColor={colors.border}
            xAxisColor={colors.border}
            yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
            xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 9 }}
            yAxisLabelSuffix={unitSuffix}
            noOfSections={3}
            disableScroll
          />
        ) : null}
      </View>
    </View>
  );
}
