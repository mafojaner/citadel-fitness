import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Text } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { gradients } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface GradientButtonProps extends PropsWithChildren {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  colors?: readonly [string, string, ...string[]];
  variant?: 'solid' | 'outline';
}

export function GradientButton({
  onPress,
  disabled,
  loading,
  label,
  colors: gradientColors = gradients.action,
  variant = 'solid',
}: GradientButtonProps) {
  const { colors, spacing, radius } = useTheme();
  const isDisabled = disabled || loading;

  if (variant === 'outline') {
    return (
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
        style={{
          borderColor: gradientColors[gradientColors.length - 1],
          borderWidth: 1.5,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: gradientColors[gradientColors.length - 1], fontWeight: '700' }}>{label}</Text>
      </AnimatedPressable>
    );
  }

  return (
    // Labelled explicitly rather than relying on the child Text: while
    // `loading` the label is swapped for a spinner, which would otherwise
    // leave the button with no accessible name at exactly the moment
    // someone is waiting to hear what it's doing. `busy` conveys the wait.
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.97}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
          shadowColor: gradientColors[gradientColors.length - 1],
          shadowOpacity: 0.35,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 4,
        }}
      >
        {loading ? (
          <ActivityIndicator color={colors.surface} />
        ) : (
          <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{label}</Text>
        )}
      </LinearGradient>
    </AnimatedPressable>
  );
}
