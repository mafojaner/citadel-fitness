import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { useTheme } from '../../theme/useTheme';

interface GrowBarProps {
  /** 0-1. Values outside are clamped rather than allowed to overflow the track. */
  share: number;
  color: string;
  height?: number;
  /** Staggers the start, so a list of bars fills in sequence rather than at once. */
  delayMs?: number;
  /** Track colour. Defaults to the page background, which reads as a groove. */
  trackColor?: string;
}

const GROW_MS = 620;

/**
 * A proportion bar that grows from nothing on mount.
 *
 * Scale rather than width, so the whole thing runs on the compositor with
 * `useNativeDriver` -- the constraint the rest of the app's motion already
 * works under. That means the bar is drawn at full width and squashed, so
 * it has to be anchored: without the left transform origin below it would
 * grow outward from its own centre, which reads as a bar being revealed
 * rather than one filling up.
 *
 * React Native has no transformOrigin, hence the pair of offsetting
 * translations around the scale. They are expressed in fractions of the
 * track, so this needs no measured width to work.
 */
export function GrowBar({ share, color, height = 8, delayMs = 0, trackColor }: GrowBarProps) {
  const { colors, radius } = useTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const target = Math.max(0, Math.min(share, 1));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: target,
      duration: GROW_MS,
      delay: delayMs,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [target, delayMs, progress]);

  return (
    <View
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: trackColor ?? colors.background,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: color,
          transform: [
            // Anchor left, scale, put it back. `percentage` translations are
            // relative to the view's own width, which is the full track.
            { translateX: '-50%' },
            { scaleX: progress },
            { translateX: '50%' },
          ],
        }}
      />
    </View>
  );
}
