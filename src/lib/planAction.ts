import type { PurchasableTier } from './billing';
import type { WaitlistTier } from './fortress';
import { tierAllows, type MembershipTier } from './membership';

/**
 * What a plan card offers, as a value rather than as JSX.
 *
 * Pulled out of the screen so the rule can be tested. It is not a
 * presentation detail: it decides whether someone is shown a way to pay,
 * and getting it wrong in either direction is a real failure — offering a
 * plan to someone who already holds it, or hiding it from someone who
 * doesn't. Today the offer is a waitlist; when billing exists this same
 * decision picks between "buy", "manage" and "nothing to do", so it is
 * worth having a test around it before money depends on it.
 */
export type PlanAction =
  /** Exactly the plan this account is on. */
  | { kind: 'current' }
  /** A lower plan, held by virtue of being on a higher one. */
  | { kind: 'included' }
  /** Waitlist status not known yet. */
  | { kind: 'loading' }
  /** Already on the list — for this plan or another one. */
  | { kind: 'joined' }
  /** The signup form, open on this plan. */
  | { kind: 'form'; tier: WaitlistTier }
  /** The offer itself. */
  | { kind: 'button'; tier: WaitlistTier }
  /** Billing is live and this plan can be bought. */
  | { kind: 'buy'; tier: PurchasableTier }
  /** Held and paid for, so the offer becomes a way out rather than in. */
  | { kind: 'manage' };

export function planAction({
  tier,
  currentTier,
  loading,
  joined,
  openTier,
  billingLive = false,
  paidForThisTier = false,
}: {
  tier: MembershipTier;
  currentTier: MembershipTier;
  loading: boolean;
  joined: boolean;
  openTier: WaitlistTier | null;
  /**
   * Whether a purchase can actually complete here. False on web, false
   * without the SDK, false without a key -- see billingAvailability.
   */
  billingLive?: boolean;
  /**
   * Whether this tier is held through a store subscription rather than a
   * hand-granted column. Only a paid holding can be managed: offering
   * "manage subscription" to someone granted Fortress by hand sends them to
   * a store page that has never heard of them.
   */
  paidForThisTier?: boolean;
}): PlanAction {
  // Held plans are told apart from each other rather than collapsed into one
  // "nothing to do". Every card carries a button, so the two need different
  // words: the plan you are on says so, and a lower one you hold by virtue
  // of being above it says that instead. Collapsing them labelled Free as
  // your current plan while you were paying for Valhalla.
  //
  // tierAllows, not equality: a Valhalla member holds Fortress too, so the
  // Fortress card must not offer them anything to buy.
  // Managing comes before "current", because both describe a plan you hold
  // and only one of them is actionable. A paid subscriber needs a route to
  // cancel; someone hand-granted the same tier has nothing to cancel and
  // must not be sent looking for it.
  if (currentTier === tier && paidForThisTier) return { kind: 'manage' };
  if (currentTier === tier) return { kind: 'current' };
  if (tier === 'free' || tierAllows(currentTier, tier)) return { kind: 'included' };

  // Checked before the waitlist branches, so the moment billing is live the
  // offer becomes a purchase rather than a signup. Free is excluded above,
  // so anything reaching here is purchasable.
  if (billingLive) return { kind: 'buy', tier: tier as PurchasableTier };

  // Checked before `joined` on purpose. While the status is still loading,
  // `joined` is false, and treating that as "not on the list" would flash a
  // signup button at someone who already signed up.
  if (loading) return { kind: 'loading' };

  // One row per person, not per plan, so being on the list at all suppresses
  // the offer on every unheld plan. The notice itself explains which plan
  // they chose.
  if (joined) return { kind: 'joined' };

  const waitlistTier = tier as WaitlistTier;
  return openTier === waitlistTier
    ? { kind: 'form', tier: waitlistTier }
    : { kind: 'button', tier: waitlistTier };
}
