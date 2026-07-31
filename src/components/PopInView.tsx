import { useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { Animated, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme/motion';

interface PopInViewProps extends PropsWithChildren {
  style?: StyleProp<ViewStyle>;
}

/** Scales and fades content in on mount — used for modal/popover-style content. */
export function PopInView({ style, children }: PopInViewProps) {
  const [opacity] = useState(() => new Animated.Value(0));
  const [scale] = useState(() => new Animated.Value(0.92));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: motion.duration.base, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
    ]).start();
  }, [opacity, scale]);

  return <Animated.View style={[style, { opacity, transform: [{ scale }] }]}>{children}</Animated.View>;
}
