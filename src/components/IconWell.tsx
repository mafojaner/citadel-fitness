import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { readableOn } from '../theme/contrast';
import { useTheme } from '../theme/useTheme';

interface IconWellProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** Diameter. The glyph is always half of it, which is what keeps a 34 and a 44 looking like the same object. */
  size?: number;
  /**
   * The thing's own ramp -- a category's, a feature's. Only its saturated
   * end is used, and only for the glyph. Left off, the glyph is ink, which
   * is right for something with no identity of its own to express.
   */
  colors?: readonly [string, string, ...string[]];
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
export function IconWell({ icon, size = 44, colors: ramp }: IconWellProps) {
  const { colors } = useTheme();
  // The glyph carries the colour; the disc stays neutral. Filling the disc
  // instead is what GradientIconBadge does, and that is now reserved for
  // paid features -- so a coloured disc means "premium" and a coloured
  // glyph means "this is a chest exercise", which are different claims and
  // now look different.
  //
  // readableOn rather than the raw hex: on the dark disc every ramp in the
  // palette already clears 3:1 and comes through untouched, but on the
  // light one not a single ink does -- see the note in theme/contrast.
  const glyph = ramp ? readableOn(ramp[ramp.length - 1], colors.border) : colors.textPrimary;
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
      <Ionicons name={icon} size={size * 0.5} color={glyph} />
    </View>
  );
}
