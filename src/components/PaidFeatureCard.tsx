import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { SettingsRow } from './SettingsRow';
import { APP_FEATURES, featureInk } from '../constants/featureCatalog';
import { useMembershipTier } from '../hooks/useMembership';
import { useOpenPlans } from '../hooks/useOpenPlans';
import { TIER_LABELS, tierAllows } from '../lib/membership';
import { useTheme } from '../theme/useTheme';

interface PaidFeatureCardProps {
  /** id from APP_FEATURES — title, description, icon and colours all come from there. */
  featureId: string;
  /**
   * What to do when a member taps, for features that are actually built.
   * Its presence is what distinguishes "yours, go and use it" from "paid
   * for, still coming" — so a feature graduates from teaser to real entry
   * point by passing this, with nothing else to remember to change.
   * Free accounts are unaffected: they still route to the Plans page.
   */
  onOpen?: () => void;
  /**
   * 'card' stands on its own among other cards. 'row' belongs inside a
   * SettingsSection, which already draws the surface and border — a Card in
   * there nests one bordered box inside another and gets its shadow clipped
   * by the section's overflow: hidden.
   */
  variant?: 'card' | 'row';
  /**
   * Replaces the "Coming soon" badge for a feature that is built but has no
   * screen to open. Offline sync is the case this exists for: it is working
   * the whole time and there is nowhere to go and look at it, so without
   * this it would advertise itself as unbuilt forever.
   */
  status?: string;
}

/**
 * A paid feature offered from inside a card that already exists, rather than
 * as a card of its own.
 *
 * The point of this variant is that some features aren't a thing you go to,
 * they're a deeper cut of something already on screen — advanced analytics
 * against the progress chart, records against a lift. As its own card such a
 * feature reads as unrelated and drifts to the bottom of the screen; as a
 * footer on the thing it extends, the offer arrives while you're looking at
 * the shallower version.
 *
 * Carries the tier as a pill beside the label, and the feature's own icon
 * badge on the left, so it reads as a link rather than a form control.
 */
export function PaidFeatureLink({
  featureId,
  label,
  onOpen,
  divider = 'top',
}: {
  featureId: string;
  /** Phrased for its host card, e.g. "See the full breakdown". */
  label: string;
  onOpen?: () => void;
  /**
   * Which side the rule sits on.
   *
   * 'top' is right when this is a footer under content it extends — the rule
   * separates it from the chart or tiles above. It is wrong when the link is
   * the only thing in its card, where a leading rule is a line with nothing
   * above it. 'bottom' matches how a record card rules off its header: the
   * content first, then the line.
   */
  divider?: 'top' | 'bottom' | 'none';
}) {
  const { colors, tiers, spacing, radius, typography } = useTheme();
  const openPlans = useOpenPlans();
  const tier = useMembershipTier();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  const entitled = tierAllows(tier, feature.tier);
  const unlocked = entitled && Boolean(onOpen);
  const accent = tiers[feature.tier];
  const onPress = unlocked && onOpen ? onOpen : openPlans;

  return (
    <AnimatedPressable
      onPress={onPress}
      scaleTo={0.98}
      accessibilityRole="button"
      accessibilityLabel={
        unlocked
          ? `${label}. ${feature.title}.`
          : `${feature.title}. ${TIER_LABELS[feature.tier]} feature. Select to learn more.`
      }
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          // The padding follows the rule to whichever side it is on, so the
          // gap always sits between the line and this row rather than
          // stranding it against the card edge.
          paddingTop: divider === 'top' ? spacing.sm : 0,
          paddingBottom: divider === 'bottom' ? spacing.sm : 0,
          borderTopWidth: divider === 'top' ? 1 : 0,
          borderTopColor: colors.border,
          borderBottomWidth: divider === 'bottom' ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        {/* The feature's icon in the feature's colour, rather than a
            gradient disc behind it. A plain tier-coloured dot was tried
            first and read as an unselected radio button — an empty circle
            beside a label is a control you tick, not a link you follow. The
            glyph says which feature this is, its ink distinguishes one from
            another, and the pill beside the label carries the tier. */}
        <Ionicons
          name={feature.icon}
          size={20}
          color={featureInk(feature)}
          style={{ width: 26, textAlign: 'center' }}
        />
        <Text
          style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary, fontWeight: '600' }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {!unlocked ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: accent.accent,
              borderWidth: 1,
              borderColor: accent.border,
              borderRadius: radius.pill,
              paddingHorizontal: spacing.sm,
              paddingVertical: 2,
            }}
          >
            <Ionicons name="lock-closed" size={9} color={accent.onAccent} />
            <Text style={{ fontSize: 10, fontWeight: '700', color: accent.onAccent }}>
              {TIER_LABELS[feature.tier]}
            </Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </AnimatedPressable>
  );
}

/**
 * A paid feature shown where it will actually live. Accounts below its tier
 * get a lock naming the tier that includes it, and a route to the Plans
 * page; accounts at or above it get "Coming soon" instead, because telling
 * someone who paid that a feature is locked would be wrong — or, once
 * `onOpen` is supplied, the feature itself.
 *
 * Copy is pulled from featureCatalog by id rather than passed in, so these
 * placements can't drift from the Plans page's own list the way the
 * landing page's chips once did.
 */
export function PaidFeatureCard({ featureId, variant = 'card', onOpen, status }: PaidFeatureCardProps) {
  const { colors, tiers, spacing, radius, typography } = useTheme();
  const openPlans = useOpenPlans();
  const tier = useMembershipTier();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  // Compared rather than equality-checked: a Valhalla member must not be told
  // a Fortress feature is locked, and a Fortress member must be told the
  // truth about a Valhalla one rather than "coming soon" for something their
  // tier will never include.
  const entitled = tierAllows(tier, feature.tier);
  const unlocked = entitled && Boolean(onOpen);
  const badgeLabel = unlocked
    ? 'Open'
    : entitled
      ? status ?? 'Coming soon'
      : TIER_LABELS[feature.tier];
  const badgeIcon = unlocked
    ? 'sparkles'
    : entitled
      ? status
        ? 'checkmark-circle'
        : 'time-outline'
      : 'lock-closed';
  const onPress = unlocked && onOpen ? onOpen : openPlans;

  // Only the locked badge is tier-coloured, because only it names a tier —
  // it's the one place outside the Plans page where "Fortress" or "Valhalla"
  // appears as a label, so it should look the way that plan's card does.
  // "Open" and "Coming soon" describe availability, not a tier, and stay in
  // the app's own accent.
  const accent = tiers[feature.tier];
  // The unlocked card is filled with primaryMuted, so a badge also filled
  // with primaryMuted disappears into it -- which is exactly what happened
  // the first time the fill went in: the chip lost its pill and the word
  // "Open" floated on the card looking like stray text. It sits on the
  // surface colour instead, so it reads as a chip on the tint the same way
  // it reads as a chip on white.
  // No unlocked branch: the filled card draws no badge, so this only ever
  // colours the two states that stay on a white surface.
  const badgeBackground = entitled ? colors.primaryMuted : accent.accent;
  const badgeForeground = entitled ? colors.primary : accent.onAccent;

  const badge = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: badgeBackground,
        // Carried on both branches so the chip keeps one silhouette, and so
        // a white Fortress chip on a white card is still a chip.
        borderWidth: 1,
        borderColor: entitled ? colors.primaryMuted : accent.border,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
      }}
    >
      <Ionicons name={badgeIcon} size={10} color={badgeForeground} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: badgeForeground }}>{badgeLabel}</Text>
    </View>
  );

  // The glow is gone.
  //
  // A tier-tinted shadow was the third attempt at making a paid feature feel
  // like more (after an outline and a chrome sheen), and it was the best of
  // the three. It stopped being right when the account centre and the
  // newsletter went flat: a card that lights up among cards that do not is
  // the loudest thing on the screen, which is the definition of an advert.
  //
  // What is left carries the same information with less: the feature's own
  // ink on its glyph, and the tier on the badge. Those two were always doing
  // the work; the glow was saying it a third time.

  if (variant === 'row') {
    return (
      <SettingsRow
        icon={feature.icon}
        title={feature.title}
        subtitle={feature.description}
        onPress={onPress}
        // Both, because rightElement replaces the row's own chevron and this
        // still navigates somewhere.
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            {badge}
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        }
      />
    );
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${feature.title}. ${
        unlocked
          ? 'Select to open.'
          : entitled
            ? 'Coming soon.'
            : `${TIER_LABELS[feature.tier]} feature. Select to learn more.`
      }`}
      scaleTo={0.98}
    >
      {unlocked ? (
        /* Solid, not tinted.
         *
         * The first attempt at making this noticeable used primaryMuted --
         * a pale peach wash -- and it read as a disabled state rather than
         * an invitation. This is the treatment RewardsCard already uses on
         * the Activity screen for the same job: a full ember fill, white
         * text, the glyph in a translucent well, and a shadow in the card's
         * own colour so it lifts off the page instead of sitting flat on
         * it. Borrowed rather than invented, so the app has one way of
         * saying "this is a door worth opening" instead of two.
         *
         * Drawn directly rather than through Card, because Card paints the
         * surface, the hairline border and a neutral shadow, and all three
         * would have to be overridden to get here.
         */
        <View
          style={{
            backgroundColor: colors.primary,
            borderRadius: radius.lg,
            padding: spacing.md,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            shadowColor: colors.primary,
            shadowOpacity: 0.35,
            shadowRadius: 14,
            shadowOffset: { width: 0, height: 6 },
            elevation: 4,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.22)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={feature.icon} size={22} color="#FFFFFF" />
          </View>

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: '#FFFFFF' }]} numberOfLines={1}>
              {feature.title}
            </Text>
            <Text
              style={[typography.caption, { color: 'rgba(255,255,255,0.85)' }]}
              numberOfLines={2}
            >
              {feature.short ?? feature.description}
            </Text>
          </View>

          {/* No "Open" chip here. On a white card it was doing real work --
              distinguishing an entry point from a locked teaser. On a card
              this loud the fill has already said it, and the badge became a
              second voice repeating the first. */}
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </View>
      ) : (
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* In colour rather than greyed out: this is advertising what the
              feature will be, not showing a disabled control. On the glyph
              rather than behind it, so it sits at the same weight as the
              icons on every other flat row in the app. */}
          <Ionicons
            name={feature.icon}
            size={26}
            color={featureInk(feature)}
            style={{ width: 32, textAlign: 'center' }}
          />

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {feature.title}
              </Text>
              {badge}
            </View>
            {/* The short line, and clamped. `description` is written for the
                plans page where someone is comparing tiers; the same
                sentence here was three lines of prose between the title and
                the chevron, which is the length at which nobody reads it. */}
            <Text
              style={[typography.caption, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {feature.short ?? feature.description}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
      )}
    </AnimatedPressable>
  );
}
