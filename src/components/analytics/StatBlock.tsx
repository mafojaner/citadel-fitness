import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface CountUpProps {
  value: number;
  /** Decimal places. Counts in whole numbers by default. */
  precision?: number;
  durationMs?: number;
  style?: StyleProp<TextStyle>;
}

const COUNT_MS = 620;

/**
 * A number that counts up to its value on mount.
 *
 * `Animated` cannot drive text content the way it drives a transform -- there
 * is no native prop to interpolate into -- so this listens to the driver and
 * writes state. That means it is the one animation in the analytics screen
 * running on the JS thread, which is why it is short, runs once, and is
 * reserved for the handful of headline figures rather than every number on
 * the page.
 *
 * Always starts from zero, including when the target is zero -- see the note
 * in the effect for why that is the case that matters rather than the one to
 * skip.
 */
export function CountUp({ value, precision = 0, durationMs = COUNT_MS, style }: CountUpProps) {
  const [shown, setShown] = useState(0);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    // A zero runs the driver too, rather than short-circuiting to the value.
    // The listener writes `t * value`, which is zero on every frame, so the
    // display is right the whole way -- and it is the path that carries a
    // figure *down* to zero when the period changes, which an early return
    // would leave showing the previous window's number.
    progress.setValue(0);
    const id = progress.addListener(({ value: t }) => {
      setShown(t * value);
    });
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      easing: Easing.out(Easing.cubic),
      // Text content cannot be driven natively, so this one stays on JS.
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      // Pinned exactly on the way out: the listener's last frame can land a
      // hair under the target and leave a headline reading 29 instead of 30.
      if (finished) setShown(value);
    });
    return () => {
      animation.stop();
      progress.removeListener(id);
    };
  }, [value, durationMs, progress]);

  return <Text style={style}>{shown.toFixed(precision)}</Text>;
}

interface StatBlockProps {
  label: string;
  value: number;
  precision?: number;
  /** Sits immediately after the number, in the muted ink: "kg", "%", "days". */
  unit?: string;
  /** Second line, for the qualifier a bare number needs. */
  detail?: string;
}

/** A headline figure with its label. The page's smallest unit of data. */
export function StatBlock({ label, value, precision = 0, unit, detail }: StatBlockProps) {
  const { colors, typography } = useTheme();

  return (
    <View style={{ flex: 1, minWidth: 96, gap: 2 }}>
      <Text
        style={[typography.caption, { color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, fontSize: 10, fontWeight: '700' }]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
        <CountUp
          value={value}
          precision={precision}
          style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800', letterSpacing: -0.3 }}
        />
        {unit ? (
          <Text style={[typography.caption, { color: colors.textMuted, fontWeight: '600' }]}>{unit}</Text>
        ) : null}
      </View>
      {detail ? (
        <Text style={[typography.caption, { color: colors.textMuted }]} numberOfLines={1}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}
