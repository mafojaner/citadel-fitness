import { useState } from 'react';
import type { ReactNode } from 'react';
import { Animated, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import { motion } from '../theme/motion';

const AnimatedPressableBase = Animated.createAnimatedComponent(Pressable);

interface AnimatedPressableProps {
  onPress?: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
  accessibilityRole?: PressableProps['accessibilityRole'];
  accessibilityLabel?: string;
  hitSlop?: PressableProps['hitSlop'];
  /** How far it shrinks on press, as a scale factor. Defaults to a subtle tap. */
  scaleTo?: number;
}

/**
 * A drop-in Pressable that scales and dims slightly on press instead of
 * snapping between styles, so every tappable surface in the app shares the
 * same tactile feel.
 *
 * Animates the Pressable itself (via Animated.createAnimatedComponent)
 * rather than wrapping an inner Animated.View around `style` — a wrapper
 * would receive layout props like `width: '47%'` one level too deep,
 * leaving the actual Pressable auto-sized and breaking flex-wrap layouts.
 */
export function AnimatedPressable({
  onPress,
  disabled,
  style,
  children,
  scaleTo = motion.scale.pressed,
  ...accessibilityProps
}: AnimatedPressableProps) {
  const [progress] = useState(() => new Animated.Value(0));

  const animateTo = (toValue: number) => {
    Animated.timing(progress, {
      toValue,
      duration: motion.duration.fast,
      useNativeDriver: true,
    }).start();
  };

  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, scaleTo] });
  const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.75] });

  return (
    <AnimatedPressableBase
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => animateTo(1)}
      onPressOut={() => animateTo(0)}
      style={[style, { transform: [{ scale }], opacity: disabled ? 0.5 : opacity }]}
      {...accessibilityProps}
    >
      {children}
    </AnimatedPressableBase>
  );
}
