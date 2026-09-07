import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { darkColors } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface GradientButtonProps extends PropsWithChildren {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label: string;
  /**
   * Only for a button whose colour carries meaning: the Plans CTA in the
   * tier's own gradient, a destructive action in red. Left off -- which is
   * every other button in the app -- this is the primary action and draws
   * in ink rather than in the accent. See `ctaFill` in tokens.
   */
  colors?: readonly [string, string, ...string[]];
  variant?: 'solid' | 'outline';
  /**
   * For a surface that is dark in both themes, which the first-run intro
   * is. `ctaFill` is a mirrored pair -- near-black on light, white on dark
   * -- so a button that reads the live theme lands black-on-black there
   * for anyone whose app is set to light. This pins it to the dark half of
   * the pair rather than inventing a third colour.
   *
   * There is no theme provider to override for a subtree; `useTheme` reads
   * a global store, so the choice is a prop or nothing.
   */
  onDark?: boolean;
}

export function GradientButton({
  onPress,
  disabled,
  loading,
  label,
  colors: gradientColors,
  variant = 'solid',
  onDark = false,
}: GradientButtonProps) {
  const theme = useTheme();
  const { spacing, radius } = theme;
  const colors = onDark ? darkColors : theme.colors;
  const scheme = onDark ? 'dark' : theme.scheme;
  const isDisabled = disabled || loading;
  // A coloured button outlines in the saturated end of its own gradient;
  // the default one outlines in the fill it would otherwise have had.
  const outlineInk = gradientColors ? gradientColors[gradientColors.length - 1] : colors.ctaFill;

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
          borderColor: outlineInk,
          borderWidth: 1.5,
          borderRadius: radius.md,
          padding: spacing.md,
          alignItems: 'center',
        }}
      >
        <Text style={{ color: outlineInk, fontWeight: '700' }}>{label}</Text>
      </AnimatedPressable>
    );
  }

  if (!gradientColors) {
    return (
      // The primary action, in ink rather than in the accent -- see the
      // note on `colors` above for which buttons opt out of this.
      //
      // Flat, and deliberately: the gradient path below carries a tinted
      // glow, which is right for a button whose colour is the point and
      // wrong for one whose whole idea is that it is the plainest, hardest
      // shape on the screen. What is left is a soft drop shadow on the
      // light theme and none on the dark one, where a shadow under a white
      // button on a near-black page is invisible work -- the same split
      // Card and FloatingTabBar make.
      <AnimatedPressable
        onPress={onPress}
        disabled={isDisabled}
        scaleTo={0.97}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled: isDisabled, busy: loading }}
      >
        <View
          style={{
            backgroundColor: colors.ctaFill,
            borderRadius: radius.md,
            padding: spacing.md,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOpacity: scheme === 'dark' ? 0 : 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 },
            elevation: scheme === 'dark' ? 0 : 4,
          }}
        >
          {loading ? (
            <ActivityIndicator color={colors.ctaText} />
          ) : (
            <Text style={{ color: colors.ctaText, fontWeight: '700' }}>{label}</Text>
          )}
        </View>
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
