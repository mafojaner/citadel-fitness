import { Ionicons } from '@expo/vector-icons';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { AnimatedPressable } from './AnimatedPressable';
import { Card } from './Card';
import { GradientIconBadge } from './GradientIconBadge';
import { SettingsRow } from './SettingsRow';
import { APP_FEATURES } from '../constants/featureCatalog';
import { useMembershipTier } from '../hooks/useMembership';
import { TIER_LABELS, tierAllows } from '../lib/membership';
import { useTheme } from '../theme/useTheme';
import type { MainTabsParamList } from '../navigation/MainTabs';

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
}

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabsParamList>,
  BottomTabNavigationProp<MainTabsParamList>
>;

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
}: {
  featureId: string;
  /** Phrased for its host card, e.g. "See the full breakdown". */
  label: string;
  onOpen?: () => void;
}) {
  const { colors, tiers, spacing, radius, typography } = useTheme();
  const navigation = useNavigation<Nav>();
  const tier = useMembershipTier();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  const entitled = tierAllows(tier, feature.tier);
  const unlocked = entitled && Boolean(onOpen);
  const accent = tiers[feature.tier];
  const onPress =
    unlocked && onOpen
      ? onOpen
      : () => navigation.navigate('Learn', { screen: 'Newsletter', params: { tab: 'plans' } });

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
          paddingTop: spacing.sm,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}
      >
        {/* The feature's own gradient badge, small. A plain tier-coloured
            dot was tried and read as an unselected radio button — an empty
            white circle beside a label is a control you tick, not a link
            you follow. The badge says which feature this is, and the pill
            beside the label carries the tier. */}
        <GradientIconBadge icon={feature.icon} colors={feature.colors} size={26} />
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
export function PaidFeatureCard({ featureId, variant = 'card', onOpen }: PaidFeatureCardProps) {
  const { colors, tiers, spacing, radius, typography, scheme } = useTheme();
  const navigation = useNavigation<Nav>();
  const tier = useMembershipTier();

  const feature = APP_FEATURES.find((f) => f.id === featureId);
  if (!feature) return null;

  // Compared rather than equality-checked: a Valhalla member must not be told
  // a Fortress feature is locked, and a Fortress member must be told the
  // truth about a Valhalla one rather than "coming soon" for something their
  // tier will never include.
  const entitled = tierAllows(tier, feature.tier);
  const unlocked = entitled && Boolean(onOpen);
  const badgeLabel = unlocked ? 'Open' : entitled ? 'Coming soon' : TIER_LABELS[feature.tier];
  const badgeIcon = unlocked ? 'sparkles' : entitled ? 'time-outline' : 'lock-closed';
  const onPress =
    unlocked && onOpen
      ? onOpen
      : () => navigation.navigate('Learn', { screen: 'Newsletter', params: { tab: 'plans' } });

  // Only the locked badge is tier-coloured, because only it names a tier —
  // it's the one place outside the Plans page where "Fortress" or "Valhalla"
  // appears as a label, so it should look the way that plan's card does.
  // "Open" and "Coming soon" describe availability, not a tier, and stay in
  // the app's own accent.
  const accent = tiers[feature.tier];
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

  /**
   * The tier reads as a soft glow in its own colour, not as an outline.
   *
   * An outlined card and a grey sheen were both tried and both looked like a
   * boxed-off advert sitting on a page of clean cards. This follows the
   * language the app already uses to make something feel like more —
   * RankingCard lifts itself with a gold-tinted shadow and no border at all —
   * so a paid feature keeps the exact silhouette of every other card and only
   * the light around it changes.
   *
   * The glow is `accent.border` rather than `accent.accent` because those are
   * the same colour wherever the accent is already visible, and the accent is
   * only overridden where it would not be: a white glow in light mode is not
   * a glow, so Fortress warms to silver there and stays white on dark.
   */
  const glow = {
    shadowColor: accent.border,
    shadowOpacity: scheme === 'dark' ? 0.5 : 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  } as const;

  if (variant === 'row') {
    return (
      <SettingsRow
        icon={feature.icon}
        iconColors={feature.colors}
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
      <Card style={glow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {/* Full colour rather than greyed out: this is advertising what the
              feature will be, not showing a disabled control. The gradients
              stay — the glow and the badge carry the tier, so the icons
              don't have to go monochrome to say which plan this belongs to. */}
          <GradientIconBadge icon={feature.icon} colors={feature.colors} size={40} />

          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Text style={[typography.subheading, { color: colors.textPrimary }]} numberOfLines={1}>
                {feature.title}
              </Text>
              {badge}
            </View>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              {feature.description}
            </Text>
          </View>

          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
      </Card>
    </AnimatedPressable>
  );
}
