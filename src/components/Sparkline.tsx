import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface SparklineProps {
  /** Chronological values. Fewer than two renders nothing. */
  values: number[];
  /** Bar colour. The caller usually tints by direction of travel. */
  color: string;
  width?: number;
  height?: number;
  accessibilityLabel?: string;
}

/**
 * A shape, drawn in plain Views.
 *
 * The strength-progression list already computed a point per session and
 * showed only the two ends of it -- "100 → 110 kg, 6 sessions" -- which
 * cannot distinguish a steady climb from a lift that spiked in week one and
 * has been sliding since. Same numbers, opposite meaning, and the middle was
 * being fetched and thrown away.
 *
 * Deliberately not the charting library the Activity screen uses. That draws
 * one SVG with axes, labels and a tooltip layer, which is right for a full
 * chart and wrong twenty times over in a list -- this has to be cheap enough
 * to put on every row. Bars rather than a line for the same reason: a line
 * needs a path, and a row of Views is something React Native lays out
 * without any of that.
 */
export function Sparkline({
  values,
  color,
  width = 64,
  height = 28,
  accessibilityLabel,
}: SparklineProps) {
  const { radius } = useTheme();

  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  const gap = 2;
  const barWidth = Math.max((width - gap * (values.length - 1)) / values.length, 1);

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
      style={{ width, height, flexDirection: 'row', alignItems: 'flex-end', gap }}
    >
      {values.map((value, index) => {
        // A flat series has no span to scale against, and dividing by zero
        // would put every bar at NaN height. Drawn at half height instead,
        // which reads as "no movement" rather than as an empty chart.
        const ratio = span === 0 ? 0.5 : (value - min) / span;
        return (
          <View
            key={index}
            style={{
              width: barWidth,
              // A floor, so the lowest session is still a visible mark
              // rather than a gap that reads as a missed week.
              height: Math.max(ratio * height, 3),
              borderRadius: radius.sm / 2,
              backgroundColor: color,
              // The most recent session is the one being asked about, so the
              // earlier ones step back rather than competing with it.
              opacity: index === values.length - 1 ? 1 : 0.45,
            }}
          />
        );
      })}
    </View>
  );
}
