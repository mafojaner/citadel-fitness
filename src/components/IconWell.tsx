import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useTheme } from '../theme/useTheme';

interface IconWellProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Diameter. The glyph is always half of it, which is what keeps a 34 and a 44 looking like the same object. */
  size?: number;
}

/**
 * An icon in a neutral disc: the app's default way of drawing a glyph next
 * to a row of text.
 *
 * This is the other half of GradientIconBadge, and which one a surface uses
 * is now a statement rather than a style. Colour in this app means "paid":
 * the tier badges, the plan cards, the accent on a premium header. Every
 * other glyph -- a category, a summary card, an empty state, a search
 * result -- draws here, in ink.
 *
 * The reason is that the app had roughly forty vivid gradient discs across
 * its screens, which is forty focal points and therefore none: a screen
 * where everything is highlighted has nothing highlighted, and the one
 * thing that genuinely needed to stand out (the offer) was competing with
 * eight category tiles for attention. SettingsRow reached this conclusion
 * on its own some time ago, for its own list; this is that decision applied
 * everywhere else.
 *
 * `border` rather than `background` for the fill: on the light theme
 * `background` is offWhite against a white card, which is a well you cannot
 * see. `border` is the app's visible neutral and steps the right way in
 * both schemes.
 */
export function IconWell({ icon, size = 44 }: IconWellProps) {
  const { colors } = useTheme();
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
