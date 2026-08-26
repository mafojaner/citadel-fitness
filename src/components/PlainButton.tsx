import { ActivityIndicator, Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { useTheme } from '../theme/useTheme';

interface PlainButtonProps {
  label: string;
  onPress?: () => void;
  /**
   * 'solid' fills with ink and writes on it in the page colour; 'outline'
   * keeps the surface and draws a border. The pair is a hierarchy: the
   * solid one is the thing to do, the outlined one is the alternative.
   */
  variant?: 'solid' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  /** Destructive actions, which have to look different from merely primary. */
  danger?: boolean;
  /**
   * Overrides the computed palette. Only for buttons that carry a meaning of
   * their own rather than a rank — the plan cards use it so the button is
   * the thing that tells you which tier you are looking at.
   */
  palette?: { background: string; ink: string; border: string };
}

/**
 * The app's flat button.
 *
 * Replaces GradientButton wherever the surrounding surface is plain: the
 * gradient version carries an orange glow and a coloured shadow, which is
 * right on a card of vivid stat tiles and wrong on a settings list or a
 * pricing card, where it is the only saturated thing on screen and reads as
 * an advert rather than a control.
 *
 * The disabled state is a View rather than a disabled Pressable when there
 * is nothing to press at all, so a screen reader announces a fact instead of
 * a control it cannot use. A genuinely temporary disable (a form that is not
 * valid yet) keeps the Pressable and its disabled state, because there the
 * control is real and will become usable.
 */
export function PlainButton({
  label,
  onPress,
  variant = 'solid',
  disabled,
  loading,
  danger,
  palette,
}: PlainButtonProps) {
  const { colors, spacing, radius, typography } = useTheme();
  const isDisabled = disabled || loading;

  const resolved =
    palette ??
    (danger
      ? { background: colors.surface, ink: colors.danger, border: colors.danger }
      : variant === 'solid'
        ? { background: colors.textPrimary, ink: colors.surface, border: colors.textPrimary }
        : { background: colors.surface, ink: colors.textPrimary, border: colors.border });

  const body = (
    <View
      style={{
        backgroundColor: isDisabled && !palette ? colors.background : resolved.background,
        borderWidth: 1,
        borderColor: isDisabled && !palette ? colors.border : resolved.border,
        borderRadius: radius.md,
        paddingVertical: spacing.md - 2,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
      }}
    >
      {loading ? (
        <ActivityIndicator color={resolved.ink} />
      ) : (
        <Text
          style={[typography.body, { color: isDisabled && !palette ? colors.textMuted : resolved.ink, fontWeight: '700' }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}
    </View>
  );

  if (!onPress) {
    return (
      <View accessibilityRole="text" accessibilityLabel={label}>
        {body}
      </View>
    );
  }

  return (
    // Labelled explicitly rather than relying on the child Text: while
    // `loading` the label is swapped for a spinner, which would otherwise
    // leave the button with no accessible name at exactly the moment someone
    // is waiting to hear what it is doing. `busy` conveys the wait.
    <AnimatedPressable
      onPress={onPress}
      disabled={isDisabled}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {body}
    </AnimatedPressable>
  );
}
