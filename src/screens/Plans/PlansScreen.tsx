import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';
import { AnimatedPressable } from '../../components/AnimatedPressable';
import { BillingPeriodToggle, type BillingPeriod } from '../../components/BillingPeriodToggle';
import { CurrencyPicker } from '../../components/CurrencyPicker';
import { InfoToggle } from '../../components/InfoToggle';
import { Card } from '../../components/Card';
import { ErrorNotice } from '../../components/ErrorNotice';
import { GradientButton } from '../../components/GradientButton';
import { GradientIconBadge } from '../../components/GradientIconBadge';
import { HeaderSearchBar } from '../../components/HeaderSearchBar';
import { PlainButton } from '../../components/PlainButton';
import { PlanPrice } from '../../components/PlanPrice';
import { ScreenContainer } from '../../components/ScreenContainer';
import {
  annualSavingPct,
  APP_FEATURES,
  isPriced,
  TIER_ORDER,
  TIER_PITCH,
  pricingFor,
  type TierPitch,
} from '../../constants/featureCatalog';
import { TIER_LABELS, tierAllows, type MembershipTier } from '../../lib/membership';
import { useMembershipTier } from '../../hooks/useMembership';
import { useIsDesktop } from '../../hooks/useResponsiveLayout';
import { useFortressWaitlist } from '../../hooks/useFortressWaitlist';
import type { WaitlistTier } from '../../lib/fortress';
import { isEmailValid } from '../../lib/email';
import { currencyNote, parseCurrency, type CurrencyCode } from '../../lib/currency';
import { planAction } from '../../lib/planAction';
import { gradients } from '../../theme/tokens';
import { useAuthStore } from '../../state/authStore';
import { useProfileStore } from '../../state/profileStore';
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
 * the same white and black as before, said the way a pricing page says it:
 * Fortress is the outlined button, Valhalla the solid dark one. Two coloured
 * header slabs read as two differently coloured cards; two buttons read as a
 * hierarchy between two offers.
 *
 * Held plans still draw a button, flat and unpressable. A card with an empty
 * space where every sibling has an action looks broken rather than finished.
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
  const { colors, tiers } = useTheme();
  const accent = tiers[tier];

  return (
    <PlainButton
      label={label}
      onPress={disabled ? undefined : onPress}
      palette={
        disabled
          ? { background: colors.background, ink: colors.textMuted, border: colors.border }
          : { background: accent.accent, ink: accent.onAccent, border: accent.border }
      }
    />
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
  recommended = false,
  period,
  onPeriodChange,
  currency,
}: {
  pitch: TierPitch;
  currentTier: MembershipTier;
  /** Share the row equally with its siblings, for the desktop side-by-side layout. */
  fill?: boolean;
  /** The plan's own call to action, rendered under the price. */
  action?: React.ReactNode;
  /** Draws the chip and the tinted surface. At most one card per screen. */
  recommended?: boolean;
  period: BillingPeriod;
  /** Omitted on cards that should show the period but not let you change it. */
  onPeriodChange?: (value: BillingPeriod) => void;
  currency: CurrencyCode;
}) {
  const { colors, spacing, radius, typography } = useTheme();
  const included = FEATURES_BY_TIER[pitch.tier];
  const isCurrent = currentTier === pitch.tier;
  const pricing = pricingFor(pitch.tier, currency);
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
        // The recommended card is tinted rather than outlined or shadowed.
        // A heavier border reads as selected-and-locked, and a shadow was
        // just removed from every other premium element for looking like an
        // advert; a faint wash lifts the card while keeping its silhouette.
        borderColor: recommended ? colors.primaryMuted : colors.border,
        backgroundColor: recommended ? colors.primaryMuted : colors.surface,
        overflow: 'hidden',
      }}
    >
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        {/* Icon left, status right. The chip and the toggle both belong up
            here rather than above the card: they qualify this plan, and a
            control that floats above three cards leaves you guessing which
            one it changes. */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          <TierIcon icon={pitch.icon} color={colors.textPrimary} size={34} />
          <View style={{ flex: 1, minWidth: 0, alignItems: 'flex-end', gap: spacing.xs }}>
            {recommended ? (
              <View
                style={{
                  backgroundColor: colors.primaryMuted,
                  borderRadius: radius.pill,
                  paddingHorizontal: spacing.md,
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '700' }}>
                  Recommended for you
                </Text>
              </View>
            ) : null}
            {onPeriodChange && isPriced(pricing) && pricing.monthly ? (
              <BillingPeriodToggle
                value={period}
                onChange={onPeriodChange}
                savingPct={annualSavingPct(pricing)}
              />
            ) : null}
          </View>
        </View>

        <Text style={{ color: colors.textPrimary, fontSize: 24, fontWeight: '800' }}>
          {TIER_LABELS[pitch.tier]}
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>{pitch.tagline}</Text>

        <View style={{ marginTop: spacing.xs }}>
          <PlanPrice pricing={pricing} period={period} fallback={pitch.price} />
        </View>

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

        {/* The reassurance line every subscription page carries under its
            button, and only once there is something to actually commit to.
            Printing "cancel anytime" beside a waitlist form would be
            answering a question nobody has been asked yet. */}
        {isPriced(pricing) && pricing.monthly && !isCurrent ? (
          <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
            No commitment · Cancel anytime
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
 * The plans page. Reached two ways: as a tab on desktop, where the sidebar
 * keeps it one click away, and as a screen pushed from Account, where
 * someone has gone looking for their membership on purpose.
 *
 * `variant` is only about the header. As a tab it draws its own, the way
 * Home, Workouts, Activity and Learn all do. Pushed from Account the
 * navigator already draws one, and a second would stack two titles.
 */
export function PlansScreen({ variant = 'tab' }: { variant?: 'tab' | 'screen' }) {
  const { colors, tiers, spacing, typography } = useTheme();
  const currentTier = useMembershipTier();
  const userId = useAuthStore((state) => state.session?.user.id);
  const isDesktop = useIsDesktop();
  const { accountEmail, joined, joinedEmail, joinedTier, loading, joining, leaving, error, join, leave } =
    useFortressWaitlist();
  // Which plan's signup form is open. Null means none — tapping a plan's
  // button opens the form inside that card, so the email field appears
  // under the plan it belongs to rather than in a shared box elsewhere.
  const [openTier, setOpenTier] = useState<WaitlistTier | null>(null);
  // Opens condensed on a phone. Once expanded it stays expanded for the
  // visit: someone who asked to see everything is comparing, and collapsing
  // the list back under them mid-comparison would be the page arguing.
  const [showAll, setShowAll] = useState(false);
  const [period, setPeriod] = useState<BillingPeriod>('monthly');
  // Closed by default. Someone arriving here wants the plans; someone
  // who wants the explanation can ask for it, and it stays open until
  // they close it.
  const [showInfo, setShowInfo] = useState(false);

  // Persisted, so the choice survives leaving the screen. Read through
  // parseCurrency because a stored preference can outlive the currency
  // it names -- an older build, or a market since dropped -- and a
  // pricing page that throws on an unknown code is worse than one that
  // shows dollars.
  const storedCurrency = useProfileStore((s) => s.preferences.currency);
  const savePreferences = useProfileStore((s) => s.savePreferences);
  const currency = parseCurrency(storedCurrency);

  const onCurrencyChange = (next: CurrencyCode) => {
    if (next === currency || !userId) return;
    // A patch, not the whole preferences object. Sending the lot would
    // write back whatever this screen happened to be holding, which is how
    // a stale read on one screen quietly reverts a setting changed on
    // another.
    savePreferences(userId, { currency: next });
  };

  // The next plan up from the one they hold, which is the only plan there is
  // anything to say about. A Valhalla member has nothing above them, so they
  // see the full list rather than a card recommending what they already pay
  // for -- the same mistake planAction exists to prevent on the buttons.
  const recommendedTier: MembershipTier = currentTier === 'free' ? 'fortress' : 'valhalla';
  const nothingToRecommend = currentTier === 'valhalla';

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

  const content = (
    <ScreenContainer>
      {/* One row instead of six lines.

          What the tiers mean, which currency, and who actually charges you
          are all true and all worth reading once. None of them is worth
          scrolling past on the way to the plans, which is what the top of
          this page had become. The control stays -- the currency pills are
          how you change something -- and the prose goes behind the "i",
          which is the part you read once and then never again. */}
      <CurrencyPicker
        value={currency}
        onChange={onCurrencyChange}
        trailing={
          <InfoToggle
            open={showInfo}
            onPress={() => setShowInfo((v) => !v)}
            label="plans and pricing"
          />
        }
      />

      {showInfo ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            Fortress tells you what you did. Valhalla tells you what to do next. You&apos;re on{' '}
            {TIER_LABELS[currentTier]}.
          </Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {currencyNote(currency)}
          </Text>
        </View>
      ) : null}

      {/* One plan first, all of them on request.

          Three cards at once is a comparison, and a comparison is work. Most
          people arriving here are on Free and the honest answer for them is
          the next plan up, so that is what the page opens with — the one
          card, in full, with everything needed to decide. "View all plans"
          is for the reader who wants to do the comparing, and it is one tap
          away rather than the price of admission.

          Desktop keeps the row, because there the three cards fit side by
          side and scanning across them costs nothing. The condensed step
          exists for the phone, where the same three cards are a scroll. */}
      {showAll || isDesktop || nothingToRecommend ? (
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
              // Never chip the plan someone is already on. recommendedTier
              // falls through to 'valhalla' for a Valhalla member, so
              // without this guard the top tier is sold its own plan --
              // which is the mistake planAction exists to stop on the
              // buttons, reappearing on the chip.
              recommended={!nothingToRecommend && tier === recommendedTier}
              period={period}
              onPeriodChange={setPeriod}
              currency={currency}
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing.md }}>
          <PlanCard
            pitch={TIER_PITCH[recommendedTier]}
            currentTier={currentTier}
            action={renderAction(recommendedTier)}
            recommended
            period={period}
            onPeriodChange={setPeriod}
            currency={currency}
          />

          <PlainButton
            label="View all plans"
            onPress={() => setShowAll(true)}
            palette={{
              background: 'transparent',
              ink: colors.textPrimary,
              border: colors.border,
            }}
          />

          {/* The way out, in plain text rather than as a third button. It is
              a real option and it should not be hidden, but it is also not
              the thing this page is asking you to do, and three buttons of
              equal weight would say otherwise. */}
          {currentTier === 'free' ? (
            <Text style={[typography.body, { color: colors.textPrimary, textAlign: 'center', fontWeight: '600' }]}>
              Keep using Citadel Fitness for free
            </Text>
          ) : null}
        </View>
      )}

      {/* Everything below is comparison material, and the condensed view
          exists precisely to not show comparison material. Someone who
          tapped "View all plans" wants it; someone who has not, does not.
          Desktop always shows it, where there is room. */}
      {showAll || isDesktop || nothingToRecommend ? (
      <>
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

      </>
      ) : null}

      {/* The closing call to action is gone: every plan carries its own now,
          and a second generic button underneath could only repeat whichever
          one you had already scrolled past. The note stays, because it is
          the honest framing for all three, and it is the one line that
          belongs on the condensed view too. */}
      <Text style={[typography.caption, { color: colors.textMuted, textAlign: 'center' }]}>
        Nothing is on sale yet. Joining a waitlist just means you hear first.
      </Text>
    </ScreenContainer>
  );

  // As a tab it has to title itself the way the other tabs do. Pushed from
  // Account the navigator already draws a header, and a second one would
  // stack two titles down the top of the screen.
  if (variant === 'screen') return content;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <HeaderSearchBar title="Plans" showSearch={false} />
      {content}
    </View>
  );
}
