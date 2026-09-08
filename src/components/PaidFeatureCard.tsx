import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { PremiumHeader, PremiumRow, StatePill } from './PremiumCard';
import { SettingsRow } from './SettingsRow';
import { APP_FEATURES, type AppFeature } from '../constants/featureCatalog';
import { useMembershipTier } from '../hooks/useMembership';
import { useOpenPlans } from '../hooks/useOpenPlans';
import { TIER_LABELS, tierAllows, type MembershipTier } from '../lib/membership';
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
/**
 * Where a feature stands for this member, and the pill that says so.
 *
 * Shared, because the card, the standalone link, the grouped list and the
 * Fortress card on Workouts all have to answer it identically -- they are
 * the same offer drawn at four sizes, and four copies of this logic is how
 * they would drift apart.
 */
export function featureState(feature: AppFeature, tier: MembershipTier, hasRoute: boolean, status?: string) {
  // Compared rather than equality-checked: a Valhalla member must not be
  // told a Fortress feature is locked, and a Fortress member must be told
  // the truth about a Valhalla one rather than "coming soon" for something
  // their tier will never include.
  const entitled = tierAllows(tier, feature.tier);
  const unlocked = entitled && hasRoute;
  return {
    entitled,
    unlocked,
    pillLabel: unlocked ? 'Open' : entitled ? status ?? 'Coming soon' : 'Locked',
    pillIcon: (unlocked
      ? 'sparkles'
      : entitled
        ? status
          ? 'checkmark-circle'
          : 'time-outline'
        : 'lock-closed') as keyof typeof Ionicons.glyphMap,
  };
}

/** "INCLUDED" rather than "FREE": a badge reading FREE beside a shield says the opposite of what the shield does. */
function tierHeading(tier: AppFeature['tier']) {
  return tier === 'free' ? 'INCLUDED' : TIER_LABELS[tier].toUpperCase();
}

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
  const { colors, spacing } = useTheme();
  const openPlans = useOpenPlans();
  const tier = useMembershipTier();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  const { unlocked, pillLabel, pillIcon } = featureState(feature, tier, Boolean(onOpen));
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
      {/* The same header-and-row a premium card is made of, minus the card,
          because this one lives inside somebody else's.
          *
          * It was a single line before -- a small glyph, a label and a
          * chevron -- which is what a settings row looks like. On a screen
          * where the paid cards announce themselves with a shield, a tier
          * name, a coloured disc and a state pill, that made the offers
          * reached through a link the quietest thing on the page and the
          * offers reached through a card the loudest, with no reason for
          * the difference other than which component someone happened to
          * use. */}
      <View
        style={{
          gap: spacing.sm,
          // The padding follows the rule to whichever side it is on, so the
          // gap always sits between the line and this block rather than
          // stranding it against the card edge.
          paddingTop: divider === 'top' ? spacing.md : 0,
          paddingBottom: divider === 'bottom' ? spacing.md : 0,
          borderTopWidth: divider === 'top' ? 1 : 0,
          borderTopColor: colors.border,
          borderBottomWidth: divider === 'bottom' ? 1 : 0,
          borderBottomColor: colors.border,
        }}
      >
        <PremiumHeader
          label={tierHeading(feature.tier)}
          trailing={<StatePill label={pillLabel} icon={pillIcon} />}
        />
        {/* The caller's label as the title, the catalogue's own sentence
            underneath. "See the full breakdown" says what this does here;
            "Every lift and muscle group, over any range" says what you get,
            and only one of those belongs to the host screen. */}
        <PremiumRow
          icon={feature.icon}
          tint={feature.ink}
          title={label}
          detail={feature.short ?? feature.description}
          detailLines={2}
        />
      </View>
    </AnimatedPressable>
  );
}

interface PaidFeatureListItem {
  featureId: string;
  /** Phrased for where it sits, e.g. "Set a target and track it". */
  label: string;
  onOpen?: () => void;
}

/**
 * Several paid features under one tier heading.
 *
 * The alternative was a stack of PaidFeatureLinks, which is what this
 * replaced: five of them in a plain card, each a line of text with a small
 * glyph, reading as a settings list rather than as five things a membership
 * buys. Giving each its own header would repeat the same shield and the
 * same tier name five times, so the heading is hoisted and the rows share
 * it -- which is also why the caller passes one tier's features per list.
 *
 * A mixed list still renders; it just falls back to a neutral heading,
 * because a card headed FORTRESS whose third row is Valhalla would be
 * lying.
 */
export function PaidFeatureList({ items }: { items: PaidFeatureListItem[] }) {
  const { colors, spacing } = useTheme();
  const openPlans = useOpenPlans();
  const tier = useMembershipTier();

  const rows = items
    .map((item) => ({ item, feature: APP_FEATURES.find((f) => f.id === item.featureId) }))
    .filter((row): row is { item: PaidFeatureListItem; feature: AppFeature } => Boolean(row.feature));
  if (rows.length === 0) return null;

  const listTier = rows[0].feature.tier;
  const uniform = rows.every((row) => row.feature.tier === listTier);
  // One state for the card, which is honest only because every row in it
  // shares a tier and therefore shares an answer. `allRouted` is the part
  // that can differ: one unbuilt feature among four built ones makes the
  // card "Coming soon", which is the cautious way round.
  const allRouted = rows.every((row) => Boolean(row.item.onOpen));
  const listState = featureState(rows[0].feature, tier, allRouted);

  return (
    <Card style={{ gap: spacing.sm }}>
      {/* One pill in the header rather than one per row: five saying
          "Open" would be five pills making the same claim about a card you
          can already tell is yours. A mixed-tier list gets no pill, because
          there is no single state to report. */}
      <PremiumHeader
        label={uniform ? tierHeading(listTier) : 'MEMBERSHIP'}
        trailing={
          uniform ? <StatePill label={listState.pillLabel} icon={listState.pillIcon} /> : undefined
        }
      />
      {rows.map(({ item, feature }, index) => {
        const state = featureState(feature, tier, Boolean(item.onOpen));
        return (
          <View key={feature.id}>
            {index > 0 ? (
              <View
                style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.sm }}
              />
            ) : null}
            <AnimatedPressable
              onPress={state.unlocked && item.onOpen ? item.onOpen : openPlans}
              scaleTo={0.98}
              accessibilityRole="button"
              accessibilityLabel={
                state.unlocked
                  ? `${item.label}. ${feature.title}.`
                  : `${feature.title}. ${TIER_LABELS[feature.tier]} feature. Select to learn more.`
              }
            >
              <PremiumRow
                icon={feature.icon}
                tint={feature.ink}
                title={item.label}
                detail={feature.short ?? feature.description}
                detailLines={2}
              />
            </AnimatedPressable>
          </View>
        );
      })}
    </Card>
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
  const { colors, tiers, spacing, radius } = useTheme();
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
  // The card variant names the tier in its own header, so down here the
  // badge only has to say where the feature stands. The row variant has no
  // header -- it is one line inside a settings section -- so there the badge
  // is the only place the tier can be named, and it still is.
  const lockedLabel = variant === 'card' ? 'Locked' : TIER_LABELS[feature.tier];
  const badgeLabel = unlocked ? 'Open' : entitled ? status ?? 'Coming soon' : lockedLabel;
  const badgeIcon = unlocked
    ? 'sparkles'
    : entitled
      ? status
        ? 'checkmark-circle'
        : 'time-outline'
      : 'lock-closed';
  const onPress = unlocked && onOpen ? onOpen : openPlans;
  const headerLabel = tierHeading(feature.tier);

  // A badge is tier-coloured only where it is actually naming a tier, which
  // after the header change is the settings row alone. On a card all three
  // states now share one pill in the app's accent: the header has already
  // said which plan this is, and three differently-coloured pills for
  // "yours", "not yet built" and "not yours" read as three different kinds
  // of object rather than three states of one.
  //
  // It also retires a standing problem. Two of the three tier fills are
  // fixed colours -- Fortress always white, Valhalla always near-black -- so
  // on a card one of them landed on a surface its own colour in each theme
  // and survived only on a hairline.
  const accent = tiers[feature.tier];
  const tierColoured = variant === 'row' && !entitled;

  // Everywhere but the settings row this is the shared StatePill; the row
  // keeps a tier-coloured badge because there it is naming the tier rather
  // than reporting a state -- a settings row has no header to name it in.
  const badge = tierColoured ? (
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
      <Ionicons name={badgeIcon} size={10} color={accent.onAccent} />
      <Text style={{ fontSize: 10, fontWeight: '700', color: accent.onAccent }}>{badgeLabel}</Text>
    </View>
  ) : (
    <StatePill label={badgeLabel} icon={badgeIcon} />
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
      {/* The same card the Fortress summary is, down to the components.
        *
        * Before this there were two premium looks on one screen: the
        * Fortress card, which said so with an accent shield and a small
        * letterspaced tier name, and this, which said so with a gradient
        * disc and a title. Two vocabularies for one idea, sitting three
        * inches apart, so neither taught you to recognise the other.
        *
        * This is the Fortress one, because it is the quieter of the two and
        * because a paid feature you have not bought is still a card on a
        * page rather than an advertisement stapled to it. The header names
        * the tier and carries the state; the row underneath is the feature.
        */}
      <Card style={{ gap: spacing.sm }}>
        <PremiumHeader label={headerLabel} trailing={badge} />
        <PremiumRow
          icon={feature.icon}
          tint={feature.ink}
          title={feature.title}
          detail={feature.short ?? feature.description}
          detailLines={2}
        />
      </Card>
    </AnimatedPressable>
  );
}
