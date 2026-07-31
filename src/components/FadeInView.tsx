import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme/motion';

interface FadeInViewProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
  duration?: number;
  /** Vertical distance (px) it settles in from. 0 disables the slide, leaving a plain fade. */
  slideDistance?: number;
}

/** Fades (and gently slides up) its children in on mount — the app's standard entrance motion. */
export function FadeInView({ style, duration = motion.duration.slow, slideDistance = 12, children }: FadeInViewProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(slideDistance));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY, duration]);

  return <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>{children}</Animated.View>;
}
