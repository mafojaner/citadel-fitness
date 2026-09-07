import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

export interface Segment {
  key: string;
  label: string;
  detail?: string;
  /** 0-1. Segments are expected to sum to 1, but are not required to. */
  share: number;
  count: number;
  color: string;
}

interface SegmentedShareBarProps {
  segments: Segment[];
}

const GROW_MS = 640;

/**
 * One bar split into parts, with a legend under it.
 *
 * A single bar rather than one per band, because the question is what the
 * training is *made of* -- the parts have to be adjacent to be compared, and
 * three separate bars make the reader do the addition. The bar grows as a
 * whole from the left rather than each segment appearing independently,
 * which would read as three things arriving instead of one thing resolving.
 *
 * Empty segments are dropped from the bar but kept in the legend: a band
 * with no sets has no width to draw, and forcing a sliver in would overstate
 * it, but "Endurance 0" is information worth keeping on the page.
 */
export function SegmentedShareBar({ segments }: SegmentedShareBarProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const drawn = segments.filter((s) => s.share > 0);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: GROW_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <View style={{ gap: spacing.md }}>
      <View
        style={{
          height: 14,
          borderRadius: radius.pill,
          backgroundColor: colors.background,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            flexDirection: 'row',
            height: '100%',
            transform: [{ translateX: '-50%' }, { scaleX: progress }, { translateX: '50%' }],
          }}
        >
          {drawn.map((segment) => (
            <View
              key={segment.key}
              style={{ flex: segment.share, height: '100%', backgroundColor: segment.color }}
            />
          ))}
        </Animated.View>
      </View>

      <View style={{ gap: spacing.sm }}>
        {segments.map((segment) => (
          <View key={segment.key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: segment.color,
                // Faded rather than hidden when a band went untrained, so the
                // row still reads as a member of the same set.
                opacity: segment.count > 0 ? 1 : 0.35,
              }}
            />
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
              {segment.label}
            </Text>
            {segment.detail ? (
              <Text style={[typography.caption, { color: colors.textMuted, flex: 1, minWidth: 0 }]}>
                {segment.detail}
              </Text>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {segment.count} set{segment.count === 1 ? '' : 's'}
            </Text>
            <Text
              style={[typography.body, { color: colors.textPrimary, fontWeight: '700', minWidth: 40, textAlign: 'right' }]}
            >
              {Math.round(segment.share * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
