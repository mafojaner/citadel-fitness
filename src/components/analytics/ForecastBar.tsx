import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface ForecastBarProps {
  /** 0-1 of the target reached so far. Clamped by the caller. */
  share: number;
  /**
   * 0-1 the trend lands on by the target date, or null when there is no
   * trend to project. Drawn as a mark on the track.
   */
  projectedShare: number | null;
  /** The status ink: the fill, and the mark when it sits inside the fill. */
  color: string;
  height?: number;
  delayMs?: number;
}

const GROW_MS = 620;

/**
 * Progress toward a target, with the forecast marked on the same track.
 *
 * The goal screen drew a plain fill and put the forecast in a sentence --
 * "on this trend you reach it around 12 Nov" -- which is the one thing the
 * page exists to say and the one thing it did not show. Here the fill is
 * where you are and the mark is where the trend puts you on the day the
 * goal is due, so "am I going to make it" is answered by whether the mark
 * clears the end of the track.
 *
 * The fill grows by scaleX rather than width, which is what keeps it on the
 * compositor under `useNativeDriver` -- the constraint the rest of the
 * app's motion works under. That means it is drawn full width and squashed,
 * so it has to be anchored: React Native has no transformOrigin, hence the
 * pair of offsetting percentage translations around the scale. Same trick
 * as GrowBar, which this would have been a variant of if the mark did not
 * need to sit on top of the fill.
 *
 * The mark does not animate. It is a fixed claim about a date, and sliding
 * it in alongside a growing bar read as a second measurement racing the
 * first.
 */
export function ForecastBar({
  share,
  projectedShare,
  color,
  height = 10,
  delayMs = 0,
}: ForecastBarProps) {
  const { colors, radius } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: share,
      duration: GROW_MS,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [share, delayMs, progress]);

  // Hidden when the forecast lands where you already are, which is what a
  // flat or falling lift produces: the mark would sit on the fill's own
  // edge and read as a decoration on it rather than as a separate reading.
  const mark =
    projectedShare !== null && Math.abs(projectedShare - share) > 0.015 ? projectedShare : null;

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: colors.background,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color,
          transform: [{ translateX: '-50%' }, { scaleX: progress }, { translateX: '50%' }],
        }}
      />

      {mark !== null ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            // Percentage of the track, so no measured width is needed. The
            // negative margin pulls the 3px rule back onto the point it
            // marks rather than starting there.
            //
            // Held a hair inside both ends: the track clips its overflow, so
            // a forecast that clears the target -- the common case for a
            // goal going well -- had half its mark cut off by the right
            // edge. A percentage point is invisible; a half-drawn mark is
            // not.
            left: `${Math.min(Math.max(mark, 0.01), 0.99) * 100}%`,
            marginLeft: -1.5,
            width: 3,
            backgroundColor: colors.textPrimary,
          }}
        />
      ) : null}
    </View>
  );
}
