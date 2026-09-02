import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface TierMarkProps {
  /** Defaults to Fortress, which is every screen currently using this. */
  label?: string;
}

/**
 * A quiet mark saying which tier this screen belongs to.
 *
 * The premium entry cards were deliberately flattened in August, because a
 * card that lights up among flat ones reads as an advert. That was right,
 * and it went one step too far: the destination screens went flat too, so
 * there was no moment anywhere in the app where the tier felt different from
 * the free product. The card said "Fortress" and the screen behind it said
 * nothing.
 *
 * So this is deliberately not a badge, a gradient or a glow -- the things
 * that were removed for good reason. It is a label, in the same shield and
 * letter-spaced caps the Fortress card on Home already uses, sitting once at
 * the top of the screen rather than on every element in it. Enough to answer
 * "is this the paid thing", quiet enough that it never competes with the
 * content it introduces.
 */
export function TierMark({ label = 'FORTRESS' }: TierMarkProps) {
  const { colors, spacing } = useTheme();

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: -spacing.xs }}
      accessibilityRole="header"
      accessibilityLabel={`${label} feature`}
    >
      <Ionicons name="shield-checkmark" size={12} color={colors.primary} />
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 1.1,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
