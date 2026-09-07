import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';
import { inkGradient } from '../theme/tokens';
import { useTheme } from '../theme/useTheme';

interface IconWellProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Diameter. The glyph is always half of it, which is what keeps a 34 and a 44 looking like the same object. */
  size?: number;
  /**
   * The subject's ink. Filled as a gradient disc with a white glyph, the
   * app's original treatment for anything with a subject of its own to
   * express -- a category, a feature, a trophy. Left off, the glyph is
   * drawn in flat text ink on a neutral disc instead, which is right for
   * something with no subject to express, like a chevron or a generic
   * marker.
   */
  tint?: string;
}

/**
 * An icon in a disc, next to a row of text.
 *
 * Given a `tint`, the disc fills with the gradient that ink belongs to
 * (`inkGradient`, keyed off the same ten colours every category and
 * feature already draws from) and the glyph goes white on top of it --
 * the app's original vocabulary for a subject, restored after a spell
 * drawing every subject in flat ink on a neutral disc made every icon in
 * the app read the same regardless of what it was.
 *
 * Left without a `tint`, the disc stays neutral (`border`) and the glyph
 * draws in `textPrimary`: the right treatment for something that has no
 * subject of its own, like a chevron.
 */
export function IconWell({ icon, size = 44, tint }: IconWellProps) {
  const { colors } = useTheme();

  if (tint) {
    const [start, end] = inkGradient[tint] ?? [tint, tint];
    return (
      <LinearGradient
        colors={[start, end]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          // Tinted with the disc's own gradient rather than plain black --
          // same fixed-opacity approach GradientButton/GradientPill use,
          // which is why neither needs to branch on scheme: a vivid tinted
          // shadow carries its own contrast on any background.
          shadowColor: start,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      >
        <Ionicons name={icon} size={size * 0.5} color="#FFFFFF" />
      </LinearGradient>
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.5} color={colors.textPrimary} />
    </View>
  );
}
