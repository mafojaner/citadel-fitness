import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { ScreenContainer } from '../../components/ScreenContainer';
import { APP_FEATURES, TIER_ORDER, TIER_PITCH, type TierPitch } from '../../constants/featureCatalog';
import { TIER_LABELS, tierAllows, type MembershipTier } from '../../lib/membership';
import { useMembershipTier } from '../../hooks/useMembership';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
import { useFortressWaitlist } from '../../hooks/useFortressWaitlist';
import type { WaitlistTier } from '../../lib/fortress';
import { isEmailValid } from '../../lib/email';
import { planAction } from '../../lib/planAction';
import { gradients } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

/**
 * What each tier adds on top of the one below it, rather than everything it
 * includes. Listing Fortress's eleven features again under Valhalla would
 * make the top card a wall of text with its actual difference buried in it.
 * The comparison table below is where the full picture lives.
 */
const FEATURES_BY_TIER: Record<MembershipTier, typeof APP_FEATURES> = {
  free: APP_FEATURES.filter((f) => f.tier === 'free'),
  fortress: APP_FEATURES.filter((f) => f.tier === 'fortress'),
  valhalla: APP_FEATURES.filter((f) => f.tier === 'valhalla'),
};

// Derived by tier comparison rather than hardcoded booleans, so a feature
// moving between tiers updates every column at once — the drift this
// catalogue exists to prevent.
const COMPARISON_ROWS: { label: string; on: Record<MembershipTier, boolean> }[] = APP_FEATURES.filter(
  (feature) => feature.showInComparison,
).map((feature) => ({
  label: feature.title,
  on: {
    free: tierAllows('free', feature.tier),
    fortress: tierAllows('fortress', feature.tier),
    valhalla: tierAllows('valhalla', feature.tier),
  },
}));

/** Equal columns, so the three tiers line up under their headers at any width. */
const COLUMN_WIDTH = 64;

function TierIcon({ icon, color, size }: { icon: TierPitch['icon']; color: string; size: number }) {
  return icon.family === 'ionicon' ? (
    <Ionicons name={icon.name} size={size} color={color} />
  ) : (
    <MaterialCommunityIcons name={icon.name as never} size={size} color={color} />
  );
}

function ComparisonMark({ on, colors }: { on: boolean; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={{ width: COLUMN_WIDTH, alignItems: 'center' }}>
      <Ionicons
        name={on ? 'checkmark-circle' : 'remove-circle-outline'}
        size={18}
        color={on ? colors.success : colors.textMuted}
      />
    </View>
  );
}

/**
 * A plan's call to action.
 *
 * The tier colour lives here now rather than in a filled card header. It is
 * the same white and black as before, but expressed the way a pricing page
 * expresses it: Fortress is the outlined button, Valhalla the solid dark
 * one. That reads as a hierarchy between two offers, where two coloured
 * header slabs just read as two differently coloured cards.
 *
 * Held plans get a flat, unpressable version. They still draw a button,
 * because a card with an empty space where every sibling has an action
 * looks broken rather than finished.
 */
function PlanButton({
  label,
  tier,
  disabled,
  onPress,
}: {
  label: string;
  tier: MembershipTier;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors, tiers, spacing, radius, typography } = useTheme();
  const accent = tiers[tier];

  const background = disabled ? colors.background : accent.accent;
  const ink = disabled ? colors.textMuted : accent.onAccent;
  const border = disabled ? colors.border : accent.border;

  const body = (
    <View
      style={{
        backgroundColor: background,
        borderWidth: 1,
        borderColor: border,
        borderRadius: radius.md,
        paddingVertical: spacing.md - 2,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
      }}
    >
      <Text style={[typography.body, { color: ink, fontWeight: '700' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );

  if (disabled || !onPress) {
    // Not a disabled Pressable: this is a statement of fact, not a control
    // that happens to be unavailable, so it should not read as tappable to
    // a screen reader either.
    return <View accessibilityRole="text" accessibilityLabel={label}>{body}</View>;
  }

  return (
    <AnimatedPressable onPress={onPress} scaleTo={0.98} accessibilityRole="button" accessibilityLabel={label}>
      {body}
    </AnimatedPressable>
  );
}

/**
 * One plan, in the shape a pricing page takes: icon, name, tagline, price,
 * the action, then a rule and what the plan adds.
 *
 * The tier's colour used to fill a header band across the top of the card.
 * That made three cards that differed by slab colour rather than three
 * offers you compare down the same columns, and on the black one it forced
 * a second text colour for the header alone. The colour now identifies the
 * plan through its button, which is the element you are being asked to act
 * on anyway.
 */
function PlanCard({
  pitch,
  currentTier,
  action,
  fill = false,
}: {
  pitch: TierPitch;
  currentTier: MembershipTier;
  /** Share the row equally with its siblings, for the desktop side-by-side layout. */
  fill?: boolean;
  /** The plan's own call to action, rendered under the price. */
  action?: React.ReactNode;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const included = FEATURES_BY_TIER[pitch.tier];
  const isCurrent = currentTier === pitch.tier;
  const addsLabel =
    pitch.tier === 'free'
      ? 'Includes'
      : pitch.tier === 'fortress'
        ? 'Everything in Free, and:'
        : 'Everything in Fortress, plus:';

  return (
    <View
      style={{
        // flexBasis 0 alongside flex 1: without it the three cards divide
        // the leftover space after their content, so the plan with eleven
        // features ends up wider than the one with three. With it they
        // divide the whole row and come out equal, which is the point of
        // showing them together.
        flex: fill ? 1 : undefined,
        flexBasis: fill ? 0 : undefined,
        minWidth: 0,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <TierIcon icon={pitch.icon} color={colors.textPrimary} size={34} />

        <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
          {TIER_LABELS[pitch.tier]}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{pitch.tagline}</Text>

        <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: '700', marginTop: spacing.xs }}>
          {pitch.price}
        </Text>

        {isCurrent ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: colors.background,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.md,
              padding: spacing.md,
            }}
          >
            <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
            <Text style={[typography.caption, { flex: 1, minWidth: 0, color: colors.textSecondary }]}>
              You are on this plan.
            </Text>
          </View>
        ) : null}

        {/* Pushed to the bottom of the equal-height card so the three buttons
            line up. Three actions at three different heights would undo the
            row's comparability, which is the only reason to put the plans
            side by side at all. */}
        {fill ? <View style={{ flex: 1, minHeight: spacing.sm }} /> : null}
        {action}

        {/* Sits under the button, the way a pricing page qualifies its own
            call to action. Valhalla is the only plan with a caveat worth
            printing, and it is a real constraint rather than a scarcity
            line: a coach's hours do not scale. */}
        {pitch.note ? (
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            {pitch.note}
          </Text>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: colors.border }} />

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{addsLabel}</Text>
        {included.map((feature) => (
          <View key={feature.id} style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' }}>
            <Ionicons name="checkmark" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
            <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}>
              {feature.title}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The signup form, opened inside the plan it belongs to.
 *
 * Split out of the old shared WaitlistAction, which did three jobs at once
 * — button, form and joined-state — for a page that only had one plan to
 * sell. With a button per plan the form has to know which plan opened it,
 * so that is a prop rather than something it infers.
 */
function WaitlistForm({
  accountEmail,
  tier,
  joining,
  error,
  onJoin,
  onCancel,
}: {
  accountEmail: string | undefined;
  tier: WaitlistTier;
  joining: boolean;
  error: string | null;
  onJoin: (email: string, tier: WaitlistTier) => void;
  onCancel: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const [emailInput, setEmailInput] = useState(accountEmail ?? '');

  const trimmedEmail = emailInput.trim();
  const emailInvalid = trimmedEmail.length > 0 && !isEmailValid(trimmedEmail);

  return (
    <View style={{ gap: spacing.sm }}>
      <TextInput
        placeholder="Email address"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={emailInput}
        onChangeText={setEmailInput}
        editable={!joining}
        accessibilityLabel={`Email address for the ${TIER_LABELS[tier]} waitlist`}
        style={{
          backgroundColor: colors.surface,
          borderColor: emailInvalid ? colors.danger : colors.border,
          borderWidth: 1,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.textPrimary,
        }}
      />
      {emailInvalid ? <Text style={{ color: colors.danger }}>Enter a valid email address</Text> : null}
      {error ? <ErrorNotice message={error} onRetry={() => onJoin(trimmedEmail, tier)} /> : null}
      <GradientButton
        label={joining ? 'Signing up...' : `Notify me about ${TIER_LABELS[tier]}`}
        colors={gradients.identity}
        loading={joining}
        disabled={!trimmedEmail || emailInvalid}
        onPress={() => onJoin(trimmedEmail, tier)}
      />
      <AnimatedPressable onPress={onCancel} scaleTo={0.96} accessibilityRole="button">
        <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>Cancel</Text>
      </AnimatedPressable>
    </View>
  );
}

/**
 * Shown on every unheld plan once someone is on the list, because the list
 * holds one row per person rather than one per plan — so joining for
 * Valhalla and then being invited to "join the Fortress waitlist" on the
 * card below would be offering something that cannot happen.
 *
 * The wording distinguishes the plan they actually chose from the others,
 * rather than claiming they signed up for whichever card they are looking
 * at. Rows created before the tiers existed have no plan recorded, and say
 * so instead of guessing one.
 */
function WaitlistJoinedNotice({
  joinedEmail,
  joinedTier,
  thisTier,
  leaving,
  error,
  onLeave,
}: {
  joinedEmail: string | undefined;
  joinedTier: WaitlistTier | null;
  thisTier: WaitlistTier;
  leaving: boolean;
  error: string | null;
  onLeave: () => void;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const isThisOne = joinedTier === thisTier;

  return (
    <View
      style={{
        gap: spacing.sm,
        backgroundColor: isThisOne ? `${colors.success}1A` : colors.background,
        borderWidth: 1,
        borderColor: isThisOne ? colors.success : colors.border,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: isThisOne ? colors.success : colors.textMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={isThisOne ? 'checkmark' : 'time-outline'} size={18} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>
            {isThisOne
              ? "You're on this list"
              : joinedTier
                ? `You're waiting for ${TIER_LABELS[joinedTier]}`
                : "You're on the waitlist"}
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            {isThisOne
              ? `We'll email ${joinedEmail ?? 'you'} the moment it goes on sale.`
              : joinedTier
                ? 'Leave that list first if you would rather wait for this plan.'
                : 'You joined before the plans existed, so no plan is recorded against your place.'}
          </Text>
        </View>
      </View>
      <AnimatedPressable onPress={onLeave} disabled={leaving} scaleTo={0.96} accessibilityRole="button">
        <Text style={[typography.caption, { color: colors.textMuted, textDecorationLine: 'underline' }]}>
          {leaving ? 'Leaving…' : 'Leave the waitlist'}
        </Text>
      </AnimatedPressable>
      {error ? <ErrorNotice message={error} onRetry={onLeave} /> : null}
    </View>
  );
}

/**
 * The plans page. Reached two ways: as the Plans pane of the Learn tab,
 * where someone is browsing, and as a screen pushed from Account, where
 * someone has gone looking for their membership on purpose.
 *
 * `variant` is only about the heading. Pushed from Account the navigator
 * already draws a "Plans" header, so repeating it inside the scroll view
 * puts the word on screen twice; inside the Learn tab there is only a
 * segmented control above, so the page has to name itself.
 */
export function PlansScreen({ variant = 'pane' }: { variant?: 'pane' | 'screen' }) {
  const { colors, tiers, spacing, typography } = useTheme();
  const currentTier = useMembershipTier();
  const isDesktop = useIsDesktop();
  const { accountEmail, joined, joinedEmail, joinedTier, loading, joining, leaving, error, join, leave } =
    useFortressWaitlist();
  // Which plan's signup form is open. Null means none — tapping a plan's
  // button opens the form inside that card, so the email field appears
  // under the plan it belongs to rather than in a shared box elsewhere.
  const [openTier, setOpenTier] = useState<WaitlistTier | null>(null);

  const renderAction = (tier: MembershipTier) => {
    // The decision lives in planAction so it can be tested without a screen;
    // this only turns the answer into pixels. See lib/planAction.ts.
    const action = planAction({ tier, currentTier, loading, joined, openTier });

    switch (action.kind) {
      case 'current':
        return <PlanButton label="Your current plan" tier={tier} disabled />;
      case 'included':
        // Worded from the reader's side. "Included" alone invites the
        // question "included in what?", and this is the card for the plan
        // they are not on.
        return <PlanButton label="Included in your plan" tier={tier} disabled />;
      case 'loading':
        return <ActivityIndicator color={colors.primary} />;
      case 'joined':
        return (
          <WaitlistJoinedNotice
            joinedEmail={joinedEmail ?? accountEmail}
            joinedTier={joinedTier}
            thisTier={tier as WaitlistTier}
            leaving={leaving}
            error={error}
            onLeave={leave}
          />
        );
      case 'form':
        return (
          <WaitlistForm
            accountEmail={accountEmail}
            tier={action.tier}
            joining={joining}
            error={error}
            onJoin={join}
            onCancel={() => setOpenTier(null)}
          />
        );
      case 'button':
        // Not "Get Fortress", which the reference design's button says. That
        // wording promises a purchase, and this opens an email form for a
        // plan that is not on sale. The button takes the shape a pricing
        // page gives it; the words still describe what happens.
        return (
          <PlanButton
            label="Join the waitlist"
            tier={action.tier}
            onPress={() => setOpenTier(action.tier)}
          />
        );
    }
  };

  return (
    <ScreenContainer>
      {variant === 'pane' ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.title, { color: colors.textPrimary }]}>Plans</Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Fortress tells you what you did. Valhalla tells you what to do next. You&apos;re on{' '}
            {TIER_LABELS[currentTier]}.
          </Text>
        </View>
      ) : (
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Fortress tells you what you did. Valhalla tells you what to do next. You&apos;re on{' '}
          {TIER_LABELS[currentTier]}.
        </Text>
      )}

      {/* Side by side on desktop, stacked on a phone. Three plans read as a
          comparison when they sit in a row — the eye scans across the
          feature lists — where stacked they read as three separate offers
          you meet one at a time and have to hold in memory. `alignItems:
          stretch` is what makes that work: without it each card is only as
          tall as its own content, so the three headers no longer line up
          and the shortest plan looks truncated rather than shorter. */}
      <View
        style={{
          flexDirection: isDesktop ? 'row' : 'column',
          alignItems: isDesktop ? 'stretch' : undefined,
          gap: spacing.md,
        }}
      >
        {TIER_ORDER.map((tier) => (
          <PlanCard
            key={tier}
            pitch={TIER_PITCH[tier]}
            currentTier={currentTier}
            action={renderAction(tier)}
            fill={isDesktop}
          />
        ))}
      </View>

      <Card title="Compare plans">
        {/* Horizontal room is tight on a phone, so each column is headed by
            the tier's key colour as well as its name — the same swatch the
            plan card above is headed with. */}
        <View style={{ gap: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Text style={[typography.caption, { flex: 1, color: colors.textMuted }]} />
            {TIER_ORDER.map((tier) => (
              <View key={tier} style={{ width: COLUMN_WIDTH, alignItems: 'center', gap: 4 }}>
                <View
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    backgroundColor: tiers[tier].accent,
                    borderWidth: 1,
                    borderColor: tiers[tier].border,
                  }}
                />
                <Text
                  style={[typography.caption, { textAlign: 'center', color: colors.textMuted, fontSize: 11 }]}
                  numberOfLines={1}
                >
                  {TIER_LABELS[tier]}
                </Text>
              </View>
            ))}
          </View>
          {COMPARISON_ROWS.map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: spacing.sm,
                borderTopWidth: 1,
                borderTopColor: colors.border,
              }}
            >
              <Text style={[typography.body, { flex: 1, minWidth: 0, color: colors.textPrimary }]}>
                {row.label}
              </Text>
              {TIER_ORDER.map((tier) => (
                <ComparisonMark key={tier} on={row.on[tier]} colors={colors} />
              ))}
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <GradientIconBadge icon="diamond" colors={gradients.favorite} size={40} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[typography.subheading, { color: colors.textPrimary }]}>Earn your way in</Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Log a workout 4 days a week for 4 weeks straight to unlock 10% off, applied automatically
              once memberships go on sale. Track your streak on the Activity tab.
            </Text>
          </View>
        </View>
      </Card>

      {/* The closing call to action is gone: every plan carries its own now,
          and a second generic button underneath could only repeat whichever
          one you had already scrolled past. The note stays, because it is
          the honest framing for all three. */}
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Nothing is on sale yet. Joining a waitlist just means you hear first.
      </Text>
    </ScreenContainer>
  );
}
