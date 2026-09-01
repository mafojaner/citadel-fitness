import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { useTheme } from '../theme/useTheme';

/**
 * A small circular "i" that shows and hides an explanation.
 *
 * The reason it exists rather than the prose simply being cut: the text
 * behind it is worth reading once and worth nobody scrolling past every
 * time. The plans page had grown to six lines of explanation above the
 * first plan -- what the tiers mean, which currency, and who actually
 * charges you -- all true, all in the way of the thing the page is for.
 *
 * Deliberately not a tooltip. A tooltip is a hover, which a phone does not
 * have, and it hides again the moment you look away from it. This stays
 * open until it is closed, so a paragraph about what a card statement will
 * say can actually be read.
 *
 * The icon fills when open, so the control shows its own state rather than
 * relying on whether the reader notices text appearing somewhere below it.
 */
export function InfoToggle({
  open,
  onPress,
  label,
}: {
  open: boolean;
  onPress: () => void;
  /** What the explanation is about, e.g. "plans and pricing". */
  label: string;
}) {
  const { colors, spacing } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      // 44px of touch through hitSlop while the drawn control stays small:
      // the Aug 20 accessibility pass set that floor, and an icon-only
      // control is exactly where it gets forgotten.
      hitSlop={12}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={open ? `Hide information about ${label}` : `About ${label}`}
      style={{
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.xs,
        borderWidth: 1,
        borderColor: open ? colors.textMuted : colors.border,
        backgroundColor: open ? colors.border : 'transparent',
      }}
    >
      <Ionicons
        name={open ? 'information-circle' : 'information-circle-outline'}
        size={17}
        color={open ? colors.textPrimary : colors.textMuted}
      />
    </Pressable>
  );
}
