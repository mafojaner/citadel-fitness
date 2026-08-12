import { useEffect, useState } from 'react';
import { Animated, View } from 'react-native';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface WaterProgressBarProps {
  /** 0–1, already clamped by the caller — this component just renders it. */
  progress: number;
  /** Defaults suit a neutral Card background; the water card passes lighter, translucent values since it sits on a solid blue background instead. */
  trackColor?: string;
  fillColor?: string;
}

const HEIGHT = 10;

/**
 * Width is the one dimension Animated can't drive on the native thread, so
 * this can't use useNativeDriver — same tradeoff react-native-gifted-charts
 * accepts internally for MiniProgressChart's line fill. A single bar
 * re-animating on each log is cheap enough that it doesn't matter here.
 */
export function WaterProgressBar({ progress, trackColor, fillColor }: WaterProgressBarProps) {
  const { colors, radius } = useTheme();
  const [widthAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: Math.max(0, Math.min(1, progress)),
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [progress, widthAnim]);

  return (
    <View
      style={{
        height: HEIGHT,
        borderRadius: radius.pill,
        backgroundColor: trackColor ?? colors.border,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={{
          height: '100%',
          borderRadius: radius.pill,
          backgroundColor: fillColor ?? gradients.water[1],
          width: widthAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      />
    </View>
  );
}
