import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { IconWell } from './IconWell';
import { useTheme } from '../theme/useTheme';

interface StatePillProps {
  /** "Open", "Coming soon", "Locked". Where the feature stands, not which tier it is. */
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/**
 * The small pill that rides at the right end of a premium header.
 *
 * One fill for all three states, in the app's accent. Three differently
 * coloured pills for "yours", "not built yet" and "not yours" read as three
 * different kinds of object rather than three states of one -- and the tier
 * fills that used to colour the locked case are fixed (Fortress always
 * white, Valhalla always near-black), so one of them landed on a surface its
 * own colour in each theme and survived on a hairline.
 */
export function StatePill({ label, icon }: StatePillProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primaryMuted,
        borderWidth: 1,
        borderColor: colors.primaryMuted,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Ionicons name={icon} size={10} color={colors.primary} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: colors.primary }}>{label}</Text>
    </View>
  );
}

interface PremiumHeaderProps {
  /** Drawn in caps. The tier's own name, or what the panel is: "FORTRESS", "FORTRESS TODAY". */
  label: string;
  /** Defaults to the shield, which is what the tier is drawn as everywhere else in the app. */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Sits at the right end of the same line. The state pill, where there is one. */
  trailing?: ReactNode;
}

/**
 * The one line that says "you are looking at something paid for".
 *
 * An accent glyph and a small letterspaced label, and that is the entire
 * premium vocabulary. It replaced an inverted near-black slab, which said
 * the same thing much more loudly and ignored the colour scheme doing it.
 *
 * Shared rather than copied because the whole point is that two cards on
 * the same screen are recognisably the same kind of card. It was written
 * once inside FortressTodayCard and the paid feature cards looked nothing
 * like it, which is how a member ended up with two different ideas of what
 * "premium" looks like on one screen.
 */
export function PremiumHeader({ label, icon = 'shield-checkmark', trailing }: PremiumHeaderProps) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ionicons name={icon} size={13} color={colors.primary} />
      {/* Stepped back, because it labels the panel rather than competing
          with its contents -- the contents are the part with something to
          say. */}
      <Text
        style={{
          color: colors.textMuted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 1,
          flex: 1,
          minWidth: 0,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      {trailing}
    </View>
  );
}

interface PremiumRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  /** The subject's ink, exactly as any other card's icon takes it. */
  tint?: string;
  /** The short, scannable half. */
  title: string;
  /** The qualifying half, stepped back under it. */
  detail: string;
  /**
   * 1 for a row whose detail is a fixed shape ("Day 3 of 3 · Push / Pull /
   * Legs"), 2 where it is a sentence someone wrote.
   */
  detailLines?: number;
}

/**
 * A line inside a premium card: a neutral disc, the subject's ink on the
 * glyph, bold title, muted detail, chevron.
 *
 * The icon here used to be a filled gradient disc, so that a paid feature's
 * glyph looked unlike every other glyph in the app. That made a calendar
 * two different objects depending on which card it landed on -- a violet
 * glyph on the free Today card, a white glyph on a magenta disc on the
 * Fortress programs card -- and a member had no way to learn that they were
 * the same idea.
 *
 * What makes this card premium is the header above it: an accent shield, a
 * tier name and a state pill, none of which any free card has. The icon
 * does not have to say it twice, and saying it twice cost the app a
 * consistent visual language for its own subjects.
 */
export function PremiumRow({ icon, tint, title, detail, detailLines = 1 }: PremiumRowProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <IconWell icon={icon} size={34} tint={tint} />
      {/* Two parts rather than one sentence. A short title with the
          qualifier underneath scans in one glance and cannot leave the row
          ragged the way a wrapped sentence does. */}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text
          style={[typography.body, { color: colors.textPrimary, fontWeight: '700' }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]} numberOfLines={detailLines}>
          {detail}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </View>
  );
}
