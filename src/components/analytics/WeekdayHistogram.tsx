import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';
import type { WeekdayCount } from '../../lib/analyticsDeep';

interface WeekdayHistogramProps {
  days: WeekdayCount[];
  /** Bar colour for the days that were trained. */
  tint: string;
  height?: number;
}

const GROW_MS = 560;
const STAGGER_MS = 45;

/**
 * Sessions per weekday, as seven columns.
 *
 * Bars grow by scaleY from the bottom so the whole row animates on the
 * compositor -- the same anchoring trick GrowBar uses, in the other axis.
 * A day with no sessions still draws its track, because the gap is the
 * finding: "never trains on Friday" is only visible if Friday is drawn.
 */
export function WeekdayHistogram({ days, tint, height = 96 }: WeekdayHistogramProps) {
  const { colors, radius, typography } = useTheme();
  // One value per weekday, created once. The array is always seven long,
  // so a period change swaps the counts without ever resizing this.
  const [progress] = useState(() => days.map(() => new Animated.Value(0)));
  const peak = Math.max(1, ...days.map((d) => d.sessions));

  useEffect(() => {
    const animations = days.map((day, i) =>
      Animated.timing(progress[i], {
        toValue: peak > 0 ? day.sessions / peak : 0,
        duration: GROW_MS,
        delay: i * STAGGER_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
    return () => animations.forEach((a) => a.stop());
  }, [days, peak, progress]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
      {days.map((day, i) => (
        <View key={day.weekday} style={{ flex: 1, alignItems: 'center', gap: 6 }}>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11, fontWeight: '700' }]}>
            {day.sessions > 0 ? day.sessions : ''}
          </Text>
          <View
            style={{
              width: '100%',
              height,
              borderRadius: radius.sm,
              backgroundColor: colors.background,
              overflow: 'hidden',
              justifyContent: 'flex-end',
            }}
          >
            <Animated.View
              style={{
                height: '100%',
                borderRadius: radius.sm,
                backgroundColor: day.sessions > 0 ? tint : 'transparent',
                transform: [
                  { translateY: '50%' },
                  { scaleY: progress[i] },
                  { translateY: '-50%' },
                ],
              }}
            />
          </View>
          <Text style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
            {day.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
